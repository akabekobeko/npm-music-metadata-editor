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
 * @param source - Whole-file bytes.
 * @returns Top-level atoms in file order.
 * @throws when a box header is truncated or an atom extends past its parent.
 */
export const parseAtomTree = (source: Uint8Array): readonly Atom[] =>
  parseRange({ source, start: 0, end: source.length });
