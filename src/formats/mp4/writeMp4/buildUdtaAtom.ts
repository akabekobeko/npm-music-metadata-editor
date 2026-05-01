import type { Atom } from "../atom/types.js";
import { buildAtom } from "./buildAtom.js";
import { concat } from "./concat.js";
import { sliceAtom } from "./sliceAtom.js";

/** Arguments for {@link buildUdtaAtom}. */
type Args = {
  /** Whole-file bytes. */
  source: Uint8Array;
  /** The original `udta` atom (or `undefined` to build one fresh). */
  udta: Atom | undefined;
  /** The newly built `meta` atom bytes. */
  newMeta: Uint8Array;
};

/**
 * Rebuild the `udta` atom replacing (or inserting) its `meta` child.
 *
 * @returns The complete `udta` atom bytes.
 */
export const buildUdtaAtom = ({ source, udta, newMeta }: Args): Uint8Array => {
  const otherChildren =
    udta?.children?.filter((c) => c.type !== "meta").map((c) => sliceAtom(source, c)) ?? [];
  return buildAtom("udta", concat([...otherChildren, newMeta]));
};
