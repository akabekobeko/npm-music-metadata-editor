import type { VorbisComment } from "../../tags/vorbisComment/types.js";
import type { PictureInfo } from "../../types.js";
import { metadataBlockPictureToPicture } from "../picture/converters/metadataBlockPictureToPicture.js";

/** Vorbis Comment key (case-insensitive) carrying base64-encoded FLAC PICTURE blocks. */
const PICTURE_KEY = "METADATA_BLOCK_PICTURE";

/**
 * Decode every `METADATA_BLOCK_PICTURE` entry inside a Vorbis Comment block.
 *
 * The convention is shared by Ogg Vorbis / Opus and any Vorbis Comment in
 * the wild: the field value is a base64 representation of a FLAC `PICTURE`
 * block body. We delegate to {@link metadataBlockPictureToPicture} per entry.
 *
 * @param comment - Source Vorbis Comment block.
 * @returns The decoded pictures in tag order.
 */
export const readVorbisCommentPictures = (comment: VorbisComment): readonly PictureInfo[] =>
  comment.comments
    .filter((entry) => entry.key.toUpperCase() === PICTURE_KEY)
    .flatMap((entry) => {
      const picture = metadataBlockPictureToPicture(entry.value);
      return picture === undefined ? [] : [picture];
    });
