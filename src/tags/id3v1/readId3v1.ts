import { decodeText } from "../../utils/encoding.js";
import { ID3V1_GENRES, ID3V1_MAGIC, ID3V1_TAG_SIZE } from "./constants.js";
import type { Id3v1Tag } from "./types.js";

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

/**
 * Determine whether the trailer is an ID3v1.0 or ID3v1.1 layout.
 *
 * @param trailer - The 128-byte trailing slice that already passed the magic check.
 * @returns `1` for ID3v1.1 (track number byte present), otherwise `0`.
 */
const detectMinorVersion = (trailer: Uint8Array): 0 | 1 => {
  const sep = trailer[125] as number;
  const candidate = trailer[126] as number;
  // ID3v1.1 marker: byte 125 is 0x00 separator and byte 126 is a non-zero track number.
  // Some legacy writers use 0x20 (' ') as the separator before a non-space track byte.
  if ((sep === 0x00 && candidate !== 0) || (sep === 0x20 && candidate !== 0x20)) {
    return 1;
  }

  return 0;
};

type ReadFieldArgs = {
  /** The 128-byte trailer slice. */
  trailer: Uint8Array;
  /** Byte offset within `trailer` where the field starts. */
  offset: number;
  /** Field length in bytes. */
  length: number;
};

/** Decode a fixed-length Latin-1 field, trimming trailing null and space padding. */
const readField = (args: ReadFieldArgs): string => {
  const { trailer, offset, length } = args;
  const slice = trailer.subarray(offset, offset + length);
  let end = slice.length;
  while (end > 0) {
    const byte = slice[end - 1] as number;
    if (byte !== 0x00 && byte !== 0x20) {
      break;
    }

    end -= 1;
  }

  return decodeText(slice.subarray(0, end), "latin1");
};
