import { Buffer } from "node:buffer";
import { encodeText } from "../../utils/encoding.js";
import { ID3V1_GENRES, ID3V1_MAGIC, ID3V1_NO_GENRE, ID3V1_TAG_SIZE } from "./constants.js";
import type { Id3v1Tag } from "./types.js";

/**
 * Build the 128-byte ID3v1 trailer for the given tag.
 *
 * Strings are truncated to fit; UTF-8-only characters are dropped silently
 * because ID3v1 fields are Latin-1 only. When `tag.minorVersion` is `1` the
 * comment is limited to 28 bytes and the track number is emitted at offset 126.
 *
 * @param tag - Tag fields to encode.
 * @returns Exactly {@link ID3V1_TAG_SIZE} bytes ready to append to a file.
 */
export const writeId3v1 = (tag: Id3v1Tag): Uint8Array => {
  const out = Buffer.alloc(ID3V1_TAG_SIZE, 0);
  out.set(ID3V1_MAGIC, 0);
  writeFixed({ out, offset: 3, length: 30, value: tag.title });
  writeFixed({ out, offset: 33, length: 30, value: tag.artist });
  writeFixed({ out, offset: 63, length: 30, value: tag.album });
  writeFixed({ out, offset: 93, length: 4, value: tag.year });

  if (tag.minorVersion === 1) {
    writeFixed({ out, offset: 97, length: 28, value: tag.comment });
    out[125] = 0x00;
    out[126] = clampTrack(tag.trackNumber);
  } else {
    writeFixed({ out, offset: 97, length: 30, value: tag.comment });
  }

  out[127] = resolveGenreByte(tag);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

type WriteFixedArgs = {
  /** Destination buffer. */
  out: Buffer;
  /** Byte offset within `out` where the field starts. */
  offset: number;
  /** Field length in bytes. */
  length: number;
  /** Value to encode (Latin-1). */
  value: string;
};

/**
 * Latin-1 encode `value`, truncate to `length` bytes, and copy into `out` at `offset`.
 * Remaining bytes in the field are left as the buffer's existing zero padding.
 */
const writeFixed = (args: WriteFixedArgs): void => {
  if (args.value === "") {
    return;
  }

  const encoded = encodeText(args.value, "latin1");
  const copyLength = Math.min(encoded.length, args.length);
  args.out.set(encoded.subarray(0, copyLength), args.offset);
};

/**
 * Clamp a track number into the single byte ID3v1.1 reserves for it.
 *
 * @param trackNumber - Desired track number, or `undefined` for "no track".
 * @returns A byte in `[0, 255]`. `0` represents "no track".
 */
const clampTrack = (trackNumber: number | undefined): number => {
  if (trackNumber === undefined || trackNumber < 1) {
    return 0;
  }

  return trackNumber > 0xff ? 0xff : Math.floor(trackNumber);
};

/**
 * Resolve the genre byte to write.
 *
 * Prefers `tag.genreCode` when it is a valid `[0, 255]` integer; otherwise looks
 * up `tag.genre` in {@link ID3V1_GENRES} (case-insensitive). Falls back to
 * {@link ID3V1_NO_GENRE} when nothing resolves.
 */
const resolveGenreByte = (tag: Id3v1Tag): number => {
  if (Number.isInteger(tag.genreCode) && tag.genreCode >= 0 && tag.genreCode <= 0xff) {
    return tag.genreCode;
  }

  if (tag.genre !== undefined) {
    const lowered = tag.genre.toLowerCase();
    const idx = ID3V1_GENRES.findIndex((name) => name.toLowerCase() === lowered);
    if (idx >= 0) {
      return idx;
    }
  }

  return ID3V1_NO_GENRE;
};
