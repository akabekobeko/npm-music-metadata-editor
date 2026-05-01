import { Buffer } from "node:buffer";
import { DEFAULT_FREEFORM_NAMESPACE } from "../../constants.js";
import type { ItunesAtom } from "../../types.js";
import { writeBox } from "./writeBox.js";
import { writeDataAtom } from "./writeDataAtom.js";
import { writeFullBoxString } from "./writeFullBoxString.js";

/**
 * Serialize one ilst child atom (`©nam`, `trkn`, `----`, …) including its
 * `data` (and, for `----`, `mean` / `name`) sub-atoms.
 *
 * @param atom - The structured atom to encode.
 * @returns The encoded box bytes.
 */
export const writeItunesAtom = (atom: ItunesAtom): Uint8Array => {
  const parts: Uint8Array[] = [];
  if (atom.name === "----") {
    parts.push(writeFullBoxString("mean", atom.meanNamespace ?? DEFAULT_FREEFORM_NAMESPACE));
    parts.push(writeFullBoxString("name", atom.meanName ?? ""));
  }

  for (const value of atom.values) {
    parts.push(writeDataAtom(value));
  }

  return writeBox(atom.name, Buffer.concat(parts));
};
