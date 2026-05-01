import { readWmaPictures } from "../../../extras/wmaExtras/readWmaPictures.js";
import type { MetadataReadResult } from "../../../types.js";
import { parseAsfTree } from "../asf/parseAsfTree.js";
import { ASF_GUID } from "../constants.js";
import { detectWmaSignature } from "../detectWma.js";
import { descriptorsToTagData } from "../metadata/descriptorsToTagData.js";
import { readContentDescription } from "../metadata/readContentDescription.js";
import { readExtendedContentDescription } from "../metadata/readExtendedContentDescription.js";
import type { ContentDescription, ExtendedDescriptor } from "../metadata/types.js";
import type { AsfObject } from "../types.js";

/**
 * Read WMA / ASF metadata.
 *
 * The reader walks the Header Object's children once, locating the optional
 * Content Description Object and Extended Content Description Object, and
 * projects their fields onto a {@link MetadataReadResult}. Header extension
 * objects (which can carry per-stream library metadata and additional
 * pictures) are deliberately left opaque in Phase 8 — Phase 9 will re-visit
 * them when picture / lyric support arrives.
 *
 * @param input - Whole-file bytes.
 * @returns A {@link MetadataReadResult} populated with the merged tag data.
 *   `pictures` / `chapters` / `lyrics` stay empty until Phase 9.
 * @throws when the leading bytes don't match the ASF Header Object GUID.
 */
export const readWma = async (input: Uint8Array): Promise<MetadataReadResult> => {
  if (!detectWmaSignature(input)) {
    throw new Error("readWma: input is not an ASF/WMA file");
  }

  const tree = parseAsfTree(input);
  const headerObject = tree.find((object) => object.guid === ASF_GUID.HeaderObject);
  const children = headerObject?.children ?? [];

  let content: ContentDescription | undefined;
  let extended: readonly ExtendedDescriptor[] = [];
  for (const child of children) {
    if (child.guid === ASF_GUID.ContentDescriptionObject) {
      content = readContentDescription(payloadOf(input, child));
      continue;
    }

    if (child.guid === ASF_GUID.ExtendedContentDescriptionObject) {
      extended = readExtendedContentDescription(payloadOf(input, child));
    }
  }

  return {
    audioFormat: "wma",
    tag: descriptorsToTagData({ content, extended }),
    pictures: readWmaPictures(extended),
    chapters: [],
  };
};

/**
 * Slice the payload bytes of an ASF object out of the source buffer.
 *
 * @param source - Whole-file bytes the object was parsed from.
 * @param object - The ASF object whose payload range is requested.
 * @returns A zero-copy view of the payload (header excluded).
 */
const payloadOf = (source: Uint8Array, object: AsfObject): Uint8Array =>
  source.subarray(object.payloadOffset, object.payloadOffset + Number(object.payloadSize));
