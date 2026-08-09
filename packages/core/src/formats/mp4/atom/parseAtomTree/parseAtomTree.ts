import { CONTAINER_ATOM_TYPES } from "../../constants.js";
import type { Atom } from "../types.js";
import { parseRange } from "./parseRange.js";

/**
 * Parse the top-level atom tree of an MP4 file.
 *
 * Walks `source` from offset 0, recursing into the container atoms listed in
 * {@link CONTAINER_ATOM_TYPES} as well as `meta` and `ilst` children. Leaf
 * atoms (e.g. `mdat`, `stco`, `data`) keep their bytes inside the buffer; the
 * caller can `subarray(payloadOffset, payloadOffset + payloadSize)` on demand.
 *
 * Trailing garbage after the last top-level atom (leftovers of an in-place
 * tag rewrite by other tools) is tolerated once a `moov` atom has been parsed:
 * the returned tree simply ends before the garbage. Writers that reassemble
 * the file from this tree must re-append the bytes past the last atom
 * themselves when they intend to preserve them.
 *
 * @param source - Whole-file bytes.
 * @returns Top-level atoms in file order.
 * @throws when a box header is truncated or an atom extends past its parent.
 */
export const parseAtomTree = (source: Uint8Array): readonly Atom[] =>
  parseRange({ source, start: 0, end: source.length, topLevel: true });
