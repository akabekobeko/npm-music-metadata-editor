import { decodeSyncSafeInt32 } from "../../../utils/syncSafeInt.js";
import {
  ID3V2_FLAG_EXPERIMENTAL,
  ID3V2_FLAG_EXTENDED,
  ID3V2_FLAG_FOOTER,
  ID3V2_FLAG_UNSYNCH,
  ID3V2_HEADER_SIZE,
  ID3V2_MAGIC,
} from "../constants.js";
import type { Id3v2HeaderFlags, Id3v2MajorVersion } from "../types.js";

/** Parsed ID3v2 header (the 10 bytes after the `"ID3"` magic plus the flags / size). */
export type Id3v2Header = {
  /** Major version (`2`, `3`, or `4`). */
  majorVersion: Id3v2MajorVersion;
  /** Revision byte. */
  revision: number;
  /** Decoded tag-level flags. */
  flags: Id3v2HeaderFlags;
  /** Tag body size in bytes (excluding the 10-byte header). */
  bodySize: number;
};

/**
 * Parse the 10-byte ID3v2 header at the start of `buffer`.
 *
 * @param buffer - Whole-file (or tag-prefix) bytes; only the first 10 bytes are inspected.
 * @returns The parsed header, or `undefined` when the magic is missing or the
 *   version byte is outside the supported `[2, 4]` range.
 */
export const parseHeader = (buffer: Uint8Array): Id3v2Header | undefined => {
  if (buffer.length < ID3V2_HEADER_SIZE) {
    return undefined;
  }

  if (
    buffer[0] !== ID3V2_MAGIC[0] ||
    buffer[1] !== ID3V2_MAGIC[1] ||
    buffer[2] !== ID3V2_MAGIC[2]
  ) {
    return undefined;
  }

  const major = buffer[3] as number;
  if (major !== 2 && major !== 3 && major !== 4) {
    return undefined;
  }

  const revision = buffer[4] as number;
  const flagsByte = buffer[5] as number;
  const bodySize = decodeSyncSafeInt32(buffer, 6);

  const flags: Id3v2HeaderFlags = {
    unsynchronization: (flagsByte & ID3V2_FLAG_UNSYNCH) !== 0,
    extendedHeader: major >= 3 && (flagsByte & ID3V2_FLAG_EXTENDED) !== 0,
    experimental: major >= 3 && (flagsByte & ID3V2_FLAG_EXPERIMENTAL) !== 0,
    footer: major >= 4 && (flagsByte & ID3V2_FLAG_FOOTER) !== 0,
  };

  return { majorVersion: major as Id3v2MajorVersion, revision, flags, bodySize };
};
