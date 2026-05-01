import { Buffer } from "node:buffer";
import type { Atom } from "../atom/types.js";

/** Bytes consumed by the `version + flags` prefix carried by `mean` and `name`. */
const FULLBOX_PREFIX_SIZE = 4;

/**
 * Decode one `mean` or `name` sub-atom inside a `----` freeform container.
 *
 * Both atoms are FullBoxes: the payload starts with 4 bytes of version+flags
 * (always zero in practice) and is followed by an ASCII string that fills the
 * remaining payload. The string is *not* null-terminated.
 *
 * @param source - Whole-file bytes.
 * @param atom - The `mean` or `name` atom to decode.
 * @returns The decoded string.
 */
export const decodeFreeformText = (source: Uint8Array, atom: Atom): string => {
  if (atom.payloadSize < FULLBOX_PREFIX_SIZE) {
    return "";
  }

  return Buffer.from(
    source.buffer,
    source.byteOffset + atom.payloadOffset + FULLBOX_PREFIX_SIZE,
    atom.payloadSize - FULLBOX_PREFIX_SIZE,
  ).toString("latin1");
};
