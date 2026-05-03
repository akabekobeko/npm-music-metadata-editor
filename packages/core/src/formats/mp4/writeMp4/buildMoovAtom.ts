import type { Atom } from "../atom/types.js";
import { buildAtom } from "./buildAtom.js";
import { concat } from "./concat.js";
import { sliceAtom } from "./sliceAtom.js";

/** Arguments for {@link buildMoovAtom}. */
type Args = {
  /** Whole-file bytes. */
  source: Uint8Array;
  /** The original `moov` atom. */
  moov: Atom;
  /** The newly built `udta` atom bytes. */
  newUdta: Uint8Array;
};

/**
 * Rebuild the `moov` atom replacing (or inserting) its `udta` child.
 *
 * @returns The complete `moov` atom bytes.
 */
export const buildMoovAtom = ({ source, moov, newUdta }: Args): Uint8Array => {
  const otherChildren =
    moov.children?.filter((c) => c.type !== "udta").map((c) => sliceAtom(source, c)) ?? [];
  return buildAtom("moov", concat([...otherChildren, newUdta]));
};
