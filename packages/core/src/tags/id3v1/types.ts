/**
 * Parsed ID3v1 (or ID3v1.1) tag.
 *
 * The tag is a fixed 128-byte block at the end of the file: `"TAG"` magic, then
 * fixed-length Latin-1 fields. v1.1 reuses the last two bytes of the comment
 * area for `0x00` + track number; we surface the difference via {@link minorVersion}.
 */
export type Id3v1Tag = {
  /** `0` for ID3v1, `1` for ID3v1.1 (track number repurposed from comment tail). */
  minorVersion: 0 | 1;
  /** Title, up to 30 Latin-1 bytes. Empty string when absent. */
  title: string;
  /** Artist, up to 30 Latin-1 bytes. Empty string when absent. */
  artist: string;
  /** Album, up to 30 Latin-1 bytes. Empty string when absent. */
  album: string;
  /** Year, exactly 4 Latin-1 digits when present. Empty string when absent. */
  year: string;
  /** Comment, up to 30 bytes for v1.0 or 28 bytes for v1.1. Empty string when absent. */
  comment: string;
  /** Track number `[1, 255]` when {@link minorVersion} is `1`, otherwise `undefined`. */
  trackNumber?: number;
  /** Resolved genre name when the genre byte maps into {@link ID3V1_GENRES}, otherwise `undefined`. */
  genre?: string;
  /** Raw genre byte from the file (`0xFF` means "no genre"). */
  genreCode: number;
};
