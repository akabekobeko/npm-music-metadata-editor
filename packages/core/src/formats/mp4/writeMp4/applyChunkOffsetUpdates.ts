import { Buffer } from "node:buffer";
import { buildOffsetRemap } from "../chunkOffset/buildOffsetRemap.js";
import { rewriteChunkOffsetAtom } from "../chunkOffset/rewriteChunkOffsetAtom.js";
import { parseMp4 } from "../readMp4/parseMp4.js";
import type { ParsedMp4 } from "../types.js";

/** Arguments for {@link applyChunkOffsetUpdates}. */
type Args = {
  /** The reassembled file bytes (with the new moov in place). */
  rebuilt: Uint8Array;
  /** Original parsed MP4 (used to locate stco / co64 atoms in the new file). */
  parsed: ParsedMp4;
  /** Old moov offset / size, plus the new moov size. */
  moovChange: { offset: number; oldSize: number; newSize: number };
};

/**
 * Apply the chunk-offset rewrites to the rebuilt file in place.
 *
 * Each `stco` / `co64` atom inside the new `moov` is located by walking the
 * rebuilt buffer's atom tree, then rewritten with the offset remap derived
 * from the `moov` size delta.
 *
 * @returns A new buffer with the chunk-offset rewrites applied.
 */
export const applyChunkOffsetUpdates = ({ rebuilt, parsed, moovChange }: Args): Uint8Array => {
  if (parsed.chunkOffsetAtoms.length === 0) {
    return rebuilt;
  }

  const remap = buildOffsetRemap({
    changedAtomOffset: moovChange.offset,
    changedAtomOldSize: moovChange.oldSize,
    changedAtomNewSize: moovChange.newSize,
  });

  // Re-parse the rebuilt file so we can locate the new offsets of every
  // stco / co64 atom (their position has shifted because moov grew).
  const newParsed = parseMp4(rebuilt);
  const out = Buffer.from(rebuilt);
  for (const atom of newParsed.chunkOffsetAtoms) {
    const updated = rewriteChunkOffsetAtom({ source: rebuilt, atom, remap });
    Buffer.from(updated).copy(out, atom.offset);
  }

  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
