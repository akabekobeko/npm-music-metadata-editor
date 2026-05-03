import { ASF_DESCRIPTOR_TYPE } from "../../formats/wma/constants.js";
import type { ExtendedDescriptor } from "../../formats/wma/metadata/types.js";
import type { PictureInfo } from "../../types.js";
import { wmPictureToPicture } from "../picture/converters/wmPictureToPicture.js";

/** Descriptor name (case-sensitive on disk) carrying WM/Picture binary blobs. */
const WM_PICTURE_NAME = "WM/Picture";

/**
 * Decode every `WM/Picture` descriptor inside an Extended Content Description
 * Object into a {@link PictureInfo}.
 *
 * Picture descriptors are recorded with `ByteArray` type. Other types are
 * skipped (defensively, since they would be malformed anyway).
 *
 * @param extended - Extended Content Description descriptors.
 * @returns The decoded pictures in source order.
 */
export const readWmaPictures = (extended: readonly ExtendedDescriptor[]): readonly PictureInfo[] =>
  extended
    .filter(
      (descriptor) =>
        descriptor.name === WM_PICTURE_NAME &&
        descriptor.type === ASF_DESCRIPTOR_TYPE.ByteArray &&
        descriptor.rawValue.length > 0,
    )
    .flatMap((descriptor) => {
      const picture = wmPictureToPicture(descriptor.rawValue);
      return picture === undefined ? [] : [picture];
    });
