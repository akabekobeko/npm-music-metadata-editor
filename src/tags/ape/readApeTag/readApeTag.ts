import { APE_FOOTER_SIZE } from "../constants.js";
import type { ApeItem, ApeTag } from "../types.js";
import { findApeTagOffset } from "./findApeTagOffset.js";
import { parseFooter } from "./parseFooter.js";
import { parseItem } from "./parseItem.js";

/**
 * Try to read an APE tag from the tail of `buffer`.
 *
 * Honours the layered layout used by MP3 + APE + ID3v1 — the trailing ID3v1
 * tag (when present) is skipped before searching for the APE footer.
 *
 * @param buffer - Whole-file bytes.
 * @returns The parsed tag, or `undefined` when no APE tag is present at the
 *   tail of the buffer.
 */
export const readApeTag = (buffer: Uint8Array): ApeTag | undefined => {
  const location = findApeTagOffset(buffer);
  if (location === undefined) {
    return undefined;
  }

  // Re-read the footer at its known location so the caller does not have to
  // pass it around — the cost is one tiny memcmp.
  const footer = parseFooter(buffer, location.tagEnd - APE_FOOTER_SIZE);
  if (footer === undefined) {
    return undefined;
  }

  const itemsStart = footer.hasHeader ? location.tagStart + APE_FOOTER_SIZE : location.tagStart;
  const itemsEnd = location.tagEnd - APE_FOOTER_SIZE;
  const items = parseItems({
    body: buffer.subarray(itemsStart, itemsEnd),
    expectedCount: footer.itemCount,
  });

  return {
    version: footer.version,
    hasHeader: footer.hasHeader,
    items,
    totalSize: location.tagEnd - location.tagStart,
  };
};

/** Arguments for {@link parseItems}. */
type Args = {
  /** Items-only bytes (no header, no footer). */
  body: Uint8Array;
  /** Item count declared by the footer. */
  expectedCount: number;
};

/**
 * Decode all items inside `body`, stopping early on malformed data.
 *
 * Mirrors ATL.NET's lenient behaviour: a corrupted item terminates the loop
 * but the items decoded so far are kept (so a single bad item does not
 * destroy access to the rest of the tag).
 *
 * @returns Items in file order.
 */
const parseItems = ({ body, expectedCount }: Args): readonly ApeItem[] => {
  const items: ApeItem[] = [];
  let cursor = 0;

  for (let i = 0; i < expectedCount; i++) {
    const result = parseItem(body, cursor);
    if (result === undefined) {
      break;
    }

    items.push(result.item);
    cursor += result.consumed;
  }

  return items;
};
