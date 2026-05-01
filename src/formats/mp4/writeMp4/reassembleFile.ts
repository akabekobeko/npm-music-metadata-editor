import type { Atom } from "../atom/types.js";
import { concat } from "./concat.js";
import { sliceAtom } from "./sliceAtom.js";

/** Arguments for {@link reassembleFile}. */
type Args = {
  /** Whole-file bytes. */
  source: Uint8Array;
  /** Original top-level atoms. */
  tree: readonly Atom[];
  /** Offset of the atom being replaced (typically the `moov` original offset). */
  replacedOffset: number;
  /** Bytes to splice in at `replacedOffset`. */
  replacement: Uint8Array;
};

/**
 * Reassemble the file with each top-level atom either kept verbatim, replaced
 * (when its `offset` matches `replacedOffset`), or shifted into its new
 * position.
 *
 * @returns The reassembled file bytes (excluding any chunk-offset rewrites).
 */
export const reassembleFile = ({ source, tree, replacedOffset, replacement }: Args): Uint8Array => {
  const parts: Uint8Array[] = [];
  for (const atom of tree) {
    if (atom.offset === replacedOffset) {
      parts.push(replacement);
    } else {
      parts.push(sliceAtom(source, atom));
    }
  }

  return concat(parts);
};
