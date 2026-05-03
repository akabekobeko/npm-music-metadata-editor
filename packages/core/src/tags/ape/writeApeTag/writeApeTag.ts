import { Buffer } from "node:buffer";
import {
  APE_DEFAULT_TAG_FLAGS,
  APE_FOOTER_SIZE,
  ApeFlags,
  ApeVersion,
  type ApeVersionValue,
} from "../constants.js";
import type { ApeItem } from "../types.js";
import { writeDescriptor } from "./writeDescriptor.js";
import { writeItem } from "./writeItem.js";

/** Arguments for {@link writeApeTag}. */
type Args = {
  /** Items to embed, in the order they should appear in the tag. */
  items: readonly ApeItem[];
  /** Target version. Defaults to {@link ApeVersion.V2}. */
  version?: ApeVersionValue;
  /**
   * Whether to emit the optional v2 header in front of the items. Defaults to
   * `true` for v2, ignored (forced to `false`) for v1.
   */
  includeHeader?: boolean;
};

/**
 * Build the byte layout of an APE tag (`[header?] + items + footer`).
 *
 * The default output is APE v2 with both header and footer present, matching
 * the convention used by mainstream taggers. Pass `version: ApeVersion.V1`
 * for the header-less v1 layout (used in some legacy MP3 + APE files).
 *
 * @returns Encoded tag bytes ready to splice into a file.
 */
export const writeApeTag = ({
  items,
  version = ApeVersion.V2,
  includeHeader = true,
}: Args): Uint8Array => {
  const itemBuffers = items.map(writeItem);
  const itemsSize = itemBuffers.reduce((sum, bytes) => sum + bytes.length, 0);
  const tagSize = itemsSize + APE_FOOTER_SIZE;

  const emitHeader = version === ApeVersion.V2 && includeHeader;
  const baseFlags =
    version === ApeVersion.V2 ? (emitHeader ? APE_DEFAULT_TAG_FLAGS : ApeFlags.HasFooter) : 0;

  const header = emitHeader
    ? writeDescriptor({ version, tagSize, itemCount: items.length, baseFlags, isHeader: true })
    : new Uint8Array();
  const footer = writeDescriptor({
    version,
    tagSize,
    itemCount: items.length,
    baseFlags,
    isHeader: false,
  });

  const total = Buffer.concat([header, ...itemBuffers, footer]);
  return new Uint8Array(total.buffer, total.byteOffset, total.byteLength);
};
