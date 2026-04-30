import type { MetadataReadResult, PictureInfo, PictureKindValue } from "../../types.js";
import { PictureKind } from "../../types.js";
import { parseFlac } from "./parseFlac/parseFlac.js";
import type { FlacPicture } from "./types.js";
import { vorbisCommentToTagData } from "./vorbisCommentToTagData.js";

/**
 * Convert a FLAC `PICTURE` block descriptor into the public {@link PictureInfo}
 * shape. The `pictureType` integer maps 1:1 with {@link PictureKind} values
 * because both follow the ID3v2 APIC numbering.
 */
const toPictureInfo = (picture: FlacPicture): PictureInfo => ({
  mimeType: picture.mimeType,
  kind: (picture.pictureType as PictureKindValue) ?? PictureKind.Other,
  description: picture.description,
  data: picture.data,
});

/**
 * Read FLAC metadata.
 *
 * Parses the metadata region (STREAMINFO + Vorbis Comment + pictures + any
 * pass-through blocks), then projects the Vorbis Comment fields onto our
 * common {@link MetadataReadResult} shape.
 *
 * @param input - Whole-file bytes.
 * @returns A {@link MetadataReadResult} populated with the FLAC tag data.
 */
export const readFlac = async (input: Uint8Array): Promise<MetadataReadResult> => {
  const parsed = parseFlac(input);
  const tag =
    parsed.vorbisComment === undefined ? {} : vorbisCommentToTagData(parsed.vorbisComment);
  return {
    audioFormat: "flac",
    tag,
    pictures: parsed.pictures.map(toPictureInfo),
    chapters: [],
  };
};
