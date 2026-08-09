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
 * Bytes past the last top-level atom (trailing garbage `parseAtomTree`
 * excluded from the tree) are carried over verbatim — the same behaviour as
 * ATL.NET's in-place rewrite, which never touches data outside the atoms it
 * edits.
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

  const lastAtom = tree[tree.length - 1];
  const tailStart = lastAtom === undefined ? 0 : lastAtom.offset + lastAtom.size;
  if (tailStart < source.length) {
    parts.push(source.subarray(tailStart));
  }

  return concat(parts);
};
