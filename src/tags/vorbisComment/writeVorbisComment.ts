import { Buffer } from "node:buffer";
import type { VorbisComment } from "./types.js";

/** ASCII byte value of the `=` separator that joins each `KEY=VALUE` entry. */
const EQUALS_BYTE = 0x3d;

/**
 * Encode a Vorbis Comment block.
 *
 * The output omits the OGG framing bit because that flag is part of the OGG
 * packet layer, not the comment block itself. Callers writing into an OGG
 * page must append `0x01` before flushing the packet (see Phase 5).
 *
 * @param tag - Comment block to encode.
 * @returns Raw block bytes ready to embed in a container (FLAC, OGG, ...).
 * @throws RangeError when an entry key contains an invalid byte (`=` or `\0`).
 */
export const writeVorbisComment = (tag: VorbisComment): Uint8Array => {
  const vendorBytes = Buffer.from(tag.vendor, "utf8");
  const entryBuffers = tag.comments.map((entry, index) => {
    if (entry.key.length === 0) {
      throw new RangeError(`writeVorbisComment: entry ${index} has an empty key`);
    }

    const keyBytes = Buffer.from(entry.key, "ascii");
    // Reject any byte the spec disallows in a key (mainly `=` and NUL). The
    // round-trip would otherwise split on the wrong separator on read.
    if (keyBytes.includes(EQUALS_BYTE) || keyBytes.includes(0)) {
      throw new RangeError(
        `writeVorbisComment: entry ${index} key "${entry.key}" contains an illegal byte`,
      );
    }

    const valueBytes = Buffer.from(entry.value, "utf8");
    const total = keyBytes.length + 1 + valueBytes.length;
    const out = Buffer.alloc(4 + total);
    out.writeUInt32LE(total, 0);
    keyBytes.copy(out, 4);
    out.writeUInt8(EQUALS_BYTE, 4 + keyBytes.length);
    valueBytes.copy(out, 4 + keyBytes.length + 1);
    return out;
  });

  const vendorBlock = Buffer.alloc(4 + vendorBytes.length);
  vendorBlock.writeUInt32LE(vendorBytes.length, 0);
  vendorBytes.copy(vendorBlock, 4);

  const countBlock = Buffer.alloc(4);
  countBlock.writeUInt32LE(tag.comments.length, 0);

  const out = Buffer.concat([vendorBlock, countBlock, ...entryBuffers]);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
