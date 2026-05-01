import type { WriteOptions } from "../../types.js";
import { buildFlac } from "./buildFlac/buildFlac.js";
import { parseFlac } from "./parseFlac/parseFlac.js";
import { tagDataToVorbisComment } from "./tagDataToVorbisComment/tagDataToVorbisComment.js";
import type { FlacWritablePicture } from "./types.js";

/** Default vendor string used when the source file had no Vorbis Comment block. */
const DEFAULT_VENDOR = "music-metadata-editor";

/**
 * Rewrite a FLAC file with new metadata.
 *
 * Strategy:
 * 1. Parse the existing metadata region to get STREAMINFO + pass-through
 *    blocks + the original audio offset.
 * 2. Build a fresh Vorbis Comment block from `options.tag`, preserving any
 *    existing entries whose key isn't managed by the high-level tag mapping.
 * 3. Carry the original `PICTURE` blocks through unchanged (Phase 9 will add
 *    full structural editing of pictures).
 * 4. Use {@link rebalancePadding} to size the trailing padding block so the
 *    audio stays at its original offset whenever possible.
 *
 * @param input - Original FLAC bytes.
 * @param options - {@link WriteOptions} carrying the tag fields to merge in.
 * @returns Rebuilt file bytes ready to persist.
 */
export const writeFlac = async (input: Uint8Array, options: WriteOptions): Promise<Uint8Array> => {
  const parsed = parseFlac(input);
  const existingVendor = parsed.vorbisComment?.vendor ?? DEFAULT_VENDOR;
  const preserveEntries = parsed.vorbisComment?.comments ?? [];

  const vorbisComment = tagDataToVorbisComment({
    tag: options.tag,
    vendor: existingVendor,
    preserveEntries,
  });

  const pictures: FlacWritablePicture[] = parsed.pictures.map((picture) => ({
    pictureType: picture.pictureType,
    mimeType: picture.mimeType,
    description: picture.description,
    width: picture.width,
    height: picture.height,
    colorDepth: picture.colorDepth,
    colorNum: picture.colorNum,
    data: picture.data,
  }));

  return buildFlac({
    parsed,
    source: input,
    vorbisComment,
    pictures,
  });
};
