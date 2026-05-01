import type { PictureInfo, PictureKindValue } from "../../../types.js";
import { PictureKind } from "../../../types.js";
import type { FlacPicture } from "../types.js";

/**
 * Convert a FLAC `PICTURE` block descriptor into the public {@link PictureInfo}
 * shape. The `pictureType` integer maps 1:1 with {@link PictureKind} values
 * because both follow the ID3v2 APIC numbering.
 *
 * @param picture - The decoded FLAC picture block.
 * @returns The picture in our {@link PictureInfo} shape.
 */
export const toPictureInfo = (picture: FlacPicture): PictureInfo => ({
  mimeType: picture.mimeType,
  kind: (picture.pictureType as PictureKindValue) ?? PictureKind.Other,
  description: picture.description,
  data: picture.data,
});
