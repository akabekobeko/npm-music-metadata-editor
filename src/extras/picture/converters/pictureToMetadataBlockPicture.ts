import { Buffer } from "node:buffer";
import type { PictureInfo } from "../../../types.js";
import { pictureToFlacPicture } from "./pictureToFlacPicture.js";

/**
 * Encode a {@link PictureInfo} as a Vorbis Comment `METADATA_BLOCK_PICTURE` value.
 *
 * The encoded value is the base64 representation of a FLAC `PICTURE` metadata
 * block body (see {@link pictureToFlacPicture}). This is the convention used
 * by both Ogg Vorbis / Opus and any Vorbis Comment in the wild.
 *
 * @param picture - Picture to encode.
 * @returns The base64 string ready to embed as the Vorbis Comment value.
 */
export const pictureToMetadataBlockPicture = (picture: PictureInfo): string => {
  const block = pictureToFlacPicture(picture);
  return Buffer.from(block.buffer, block.byteOffset, block.byteLength).toString("base64");
};
