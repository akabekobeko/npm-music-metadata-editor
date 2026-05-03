import { Buffer } from "node:buffer";
import type { PictureInfo } from "../../../types.js";
import { flacPictureToPicture } from "./flacPictureToPicture.js";

/**
 * Decode a Vorbis Comment `METADATA_BLOCK_PICTURE` value into a {@link PictureInfo}.
 *
 * The value on disk is a base64-encoded FLAC `PICTURE` metadata block body.
 * Decoding is therefore a two-step pipeline: base64 → bytes →
 * {@link flacPictureToPicture}.
 *
 * @param base64 - Field value as it appeared in the Vorbis Comment entry.
 * @returns The decoded picture, or `undefined` when the base64 payload or the
 *   wrapped FLAC PICTURE block is malformed.
 */
export const metadataBlockPictureToPicture = (base64: string): PictureInfo | undefined => {
  const buffer = Buffer.from(base64.trim(), "base64");
  if (buffer.length === 0) {
    return undefined;
  }

  return flacPictureToPicture(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
};
