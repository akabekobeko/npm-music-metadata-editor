import { Buffer } from "node:buffer";
import { pictureToWmPicture } from "../../../extras/picture/converters/pictureToWmPicture.js";
import type { PictureInfo, WriteOptions } from "../../../types.js";
import { parseAsfTree } from "../asf/parseAsfTree.js";
import { ASF_DESCRIPTOR_TYPE, ASF_GUID } from "../constants.js";
import { detectWmaSignature } from "../detectWma.js";
import { readContentDescription } from "../metadata/readContentDescription.js";
import { readExtendedContentDescription } from "../metadata/readExtendedContentDescription.js";
import { tagDataToContentDescription } from "../metadata/tagDataToContentDescription.js";
import { tagDataToExtendedDescriptors } from "../metadata/tagDataToExtendedDescriptors.js";
import type { ExtendedDescriptor } from "../metadata/types.js";
import { writeContentDescription } from "../metadata/writeContentDescription.js";
import { writeExtendedContentDescription } from "../metadata/writeExtendedContentDescription.js";
import { buildAsfObject } from "./buildAsfObject.js";
import { buildHeaderObject } from "./buildHeaderObject.js";
import { updateFilePropertiesSize } from "./updateFilePropertiesSize.js";

/** GUIDs we own and rebuild from `options.tag` on every write. */
const REPLACED_CHILD_GUIDS: ReadonlySet<string> = new Set([
  ASF_GUID.ContentDescriptionObject,
  ASF_GUID.ExtendedContentDescriptionObject,
]);

/**
 * Rewrite a WMA / ASF file with new metadata.
 *
 * Strategy:
 *
 * 1. Walk the Header Object's children and capture the existing Content
 *    Description and Extended Content Description so we can preserve fields
 *    the caller didn't override (and round-trip unmanaged extended
 *    descriptors verbatim).
 * 2. Concatenate every Header Object child whose GUID we don't own,
 *    preserving original order, plus freshly built Content Description and
 *    Extended Content Description Objects.
 * 3. Wrap the lot in a fresh Header Object envelope.
 * 4. Append every top-level object that follows the Header Object (the
 *    `Data Object` plus any optional Index Objects) verbatim.
 * 5. Patch the File Properties Object's `File Size` field so it matches the
 *    rebuilt file's length.
 *
 * @param input - Original WMA bytes.
 * @param options - {@link WriteOptions} carrying the tag fields to merge in.
 * @returns Rebuilt file bytes ready to persist.
 * @throws when the leading bytes don't match the ASF Header Object GUID.
 */
export const writeWma = async (input: Uint8Array, options: WriteOptions): Promise<Uint8Array> => {
  if (!detectWmaSignature(input)) {
    throw new Error("writeWma: input is not an ASF/WMA file");
  }

  const tree = parseAsfTree(input);
  const headerObject = tree.find((object) => object.guid === ASF_GUID.HeaderObject);
  if (headerObject === undefined) {
    throw new Error("writeWma: missing Header Object");
  }

  const existingChildren = headerObject.children ?? [];
  const payloadOf = (guid: string): Uint8Array | undefined => {
    const child = existingChildren.find((object) => object.guid === guid);
    return child === undefined
      ? undefined
      : input.subarray(child.payloadOffset, child.payloadOffset + Number(child.payloadSize));
  };
  const existingContent = payloadOf(ASF_GUID.ContentDescriptionObject);
  const existingExtendedPayload = payloadOf(ASF_GUID.ExtendedContentDescriptionObject);

  const existingDescription =
    existingContent === undefined ? undefined : readContentDescription(existingContent);
  const existingExtended =
    existingExtendedPayload === undefined
      ? []
      : readExtendedContentDescription(existingExtendedPayload);

  const newDescription = tagDataToContentDescription({
    tag: options.tag,
    existing: existingDescription,
  });
  const filteredExtended = filterExtendedExtras({
    extended: existingExtended,
    overridePictures: options.pictures !== undefined,
  });
  const newExtended = [
    ...tagDataToExtendedDescriptors({ tag: options.tag, existing: filteredExtended }),
    ...buildPictureDescriptors(options.pictures),
  ];

  const preserved: Buffer[] = [];
  let preservedCount = 0;
  for (const child of existingChildren) {
    if (REPLACED_CHILD_GUIDS.has(child.guid)) {
      continue;
    }

    preserved.push(Buffer.from(input.subarray(child.offset, child.offset + Number(child.size))));
    preservedCount++;
  }

  const childParts: Buffer[] = preserved;
  let childCount = preservedCount;
  if (newDescription !== undefined) {
    const bytes = buildAsfObject({
      guid: ASF_GUID.ContentDescriptionObject,
      payload: writeContentDescription(newDescription),
    });
    childParts.push(Buffer.from(bytes));
    childCount++;
  }

  if (newExtended.length > 0) {
    const bytes = buildAsfObject({
      guid: ASF_GUID.ExtendedContentDescriptionObject,
      payload: writeExtendedContentDescription(newExtended),
    });
    childParts.push(Buffer.from(bytes));
    childCount++;
  }

  const newHeaderObject = buildHeaderObject({
    children: Buffer.concat(childParts),
    childCount,
  });

  // Top-level objects that follow the original Header Object (Data Object,
  // optional Simple Index Object, etc.) are concatenated verbatim. Their
  // offsets are preserved relative to each other, but absolute offsets shift
  // by `(newHeaderObject.length - oldHeaderObject.length)` — ASF consumers
  // tolerate that since Index Objects encode relative offsets.
  const trailing: Buffer[] = [];
  for (const object of tree) {
    if (object.guid === ASF_GUID.HeaderObject) {
      continue;
    }

    trailing.push(Buffer.from(input.subarray(object.offset, object.offset + Number(object.size))));
  }

  const out = Buffer.concat([Buffer.from(newHeaderObject), ...trailing]);
  return updateFilePropertiesSize(new Uint8Array(out.buffer, out.byteOffset, out.byteLength));
};

/** Arguments for {@link filterExtendedExtras}. */
type FilterArgs = {
  /** Existing Extended Content Description descriptors. */
  extended: readonly ExtendedDescriptor[];
  /** `true` when the writer is about to re-emit `WM/Picture` descriptors. */
  overridePictures: boolean;
};

/**
 * Drop pre-existing `WM/Picture` descriptors when the writer is about to
 * synthesize new ones, so the output never carries stale duplicates.
 *
 * @returns The filtered descriptor list, in source order.
 */
const filterExtendedExtras = ({ extended, overridePictures }: FilterArgs): ExtendedDescriptor[] => {
  if (!overridePictures) {
    return [...extended];
  }

  return extended.filter((descriptor) => descriptor.name !== "WM/Picture");
};

/**
 * Build the `WM/Picture` descriptors emitted from {@link WriteOptions.pictures}.
 *
 * The encoded picture bytes are stored on `rawValue` so the writer's value
 * encoder reuses them verbatim (the `value` slot mirrors the same buffer for
 * symmetry with descriptors decoded from disk).
 *
 * @param pictures - Pictures the caller wants embedded, or `undefined` to skip.
 * @returns One descriptor per picture, in supplied order.
 */
const buildPictureDescriptors = (
  pictures: readonly PictureInfo[] | undefined,
): ExtendedDescriptor[] => {
  if (pictures === undefined) {
    return [];
  }

  return pictures.map((picture) => {
    const bytes = pictureToWmPicture(picture);
    return {
      name: "WM/Picture",
      type: ASF_DESCRIPTOR_TYPE.ByteArray,
      value: bytes,
      rawValue: bytes,
    };
  });
};
