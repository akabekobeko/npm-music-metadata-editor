import type { Atom } from "../atom/types.js";

/**
 * Slice a child atom out of the source buffer, returning its raw bytes.
 *
 * @param source - The buffer to slice from.
 * @param atom - The atom to extract.
 * @returns A `Uint8Array` view of the atom's bytes.
 */
export const sliceAtom = (source: Uint8Array, atom: Atom): Uint8Array =>
  source.subarray(atom.offset, atom.offset + atom.size);
