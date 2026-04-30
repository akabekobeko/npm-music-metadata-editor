import { Buffer } from "node:buffer";
import type { Atom } from "../atom/types.js";

/** Bytes consumed by `(version + flags) + entry_count` at the start of a chunk-offset payload. */
const STCO_HEADER_PREFIX_SIZE = 8;

/** Arguments for {@link rewriteChunkOffsetAtom}. */
type Args = {
  /** Source buffer that contains the chunk-offset atom. */
  source: Uint8Array;
  /** The `stco` or `co64` atom whose entries should be rewritten. */
  atom: Atom;
  /**
   * Function that maps each original offset to its new offset.
   *
   * Returning the same value leaves the entry untouched; the function is
   * expected to be deterministic and side-effect-free.
   */
  remap: (oldOffset: number) => number;
};

/**
 * Produce a fresh copy of an `stco` / `co64` atom with all chunk offsets
 * remapped through `remap`.
 *
 * The atom's box header is preserved verbatim (size and type are unchanged
 * because each entry retains its width). Only the offset entries are
 * rewritten.
 *
 * @returns A new `Uint8Array` with the rewritten box bytes.
 * @throws when the atom is neither `stco` nor `co64`, or when its payload is
 *   malformed.
 */
export const rewriteChunkOffsetAtom = ({ source, atom, remap }: Args): Uint8Array => {
  if (atom.type !== "stco" && atom.type !== "co64") {
    throw new Error(`rewriteChunkOffsetAtom: unsupported atom type "${atom.type}"`);
  }

  if (atom.payloadSize < STCO_HEADER_PREFIX_SIZE) {
    throw new Error(
      `rewriteChunkOffsetAtom: ${atom.type} atom at offset ${atom.offset} is truncated`,
    );
  }

  const original = source.subarray(atom.offset, atom.offset + atom.size);
  const out = Buffer.from(original);

  // Payload starts after the 8-byte box header. The first 4 bytes are
  // version+flags (preserved as-is); the next 4 bytes are the entry count.
  const payloadStart = atom.headerSize;
  const entryCountOffset = payloadStart + 4;
  const entryCount = out.readUInt32BE(entryCountOffset);

  const entryWidth = atom.type === "stco" ? 4 : 8;
  const entriesStart = payloadStart + STCO_HEADER_PREFIX_SIZE;
  const expectedSize = entriesStart + entryCount * entryWidth;
  if (atom.size < expectedSize) {
    throw new Error(
      `rewriteChunkOffsetAtom: ${atom.type} atom at offset ${atom.offset} declares ${entryCount} entries but only ${atom.payloadSize - STCO_HEADER_PREFIX_SIZE} bytes remain in payload`,
    );
  }

  for (let i = 0; i < entryCount; i++) {
    const cursor = entriesStart + i * entryWidth;
    if (entryWidth === 4) {
      const oldOffset = out.readUInt32BE(cursor);
      const newOffset = remap(oldOffset);
      if (newOffset < 0 || newOffset > 0xffffffff) {
        throw new Error(
          `rewriteChunkOffsetAtom: stco entry ${i} → ${newOffset} does not fit in 32 bits`,
        );
      }

      out.writeUInt32BE(newOffset, cursor);
    } else {
      const oldOffset = Number(out.readBigUInt64BE(cursor));
      const newOffset = remap(oldOffset);
      out.writeBigUInt64BE(BigInt(newOffset), cursor);
    }
  }

  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
