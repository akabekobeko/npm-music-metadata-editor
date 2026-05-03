import { ID3V1_GENRES, ID3V1_MAGIC, ID3V1_TAG_SIZE } from "../constants.js";
import type { Id3v1Tag } from "../types.js";
import { detectMinorVersion } from "./detectMinorVersion.js";
import { readField } from "./readField.js";

/**
 * Try to read an ID3v1 / ID3v1.1 tag from the trailing 128 bytes of `buffer`.
 *
 * Detects ID3v1.1 by checking the byte at offset 125 of the trailer: if it is
 * `0` (and the next byte is non-zero), the trailing 2 bytes are interpreted as
 * `0x00` + track number, otherwise they are part of a 30-byte comment field.
 *
 * @param buffer - Whole-file bytes; only the last {@link ID3V1_TAG_SIZE} are inspected.
 * @returns The parsed tag, or `undefined` when no `"TAG"` magic is present.
 */
export const readId3v1 = (buffer: Uint8Array): Id3v1Tag | undefined => {
  if (buffer.length < ID3V1_TAG_SIZE) {
    return undefined;
  }

  const trailer = buffer.subarray(buffer.length - ID3V1_TAG_SIZE);
  if (
    trailer[0] !== ID3V1_MAGIC[0] ||
    trailer[1] !== ID3V1_MAGIC[1] ||
    trailer[2] !== ID3V1_MAGIC[2]
  ) {
    return undefined;
  }

  const minorVersion = detectMinorVersion(trailer);
  const title = readField({ trailer, offset: 3, length: 30 });
  const artist = readField({ trailer, offset: 33, length: 30 });
  const album = readField({ trailer, offset: 63, length: 30 });
  const year = readField({ trailer, offset: 93, length: 4 });
  const commentLength = minorVersion === 1 ? 28 : 30;
  const comment = readField({ trailer, offset: 97, length: commentLength });
  const trackNumber = minorVersion === 1 ? (trailer[126] as number) : undefined;
  const genreCode = trailer[127] as number;
  const genre = genreCode < ID3V1_GENRES.length ? ID3V1_GENRES[genreCode] : undefined;

  return {
    minorVersion,
    title,
    artist,
    album,
    year,
    comment,
    ...(trackNumber !== undefined && trackNumber > 0 ? { trackNumber } : {}),
    ...(genre !== undefined ? { genre } : {}),
    genreCode,
  };
};
