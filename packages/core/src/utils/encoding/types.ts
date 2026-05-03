/**
 * Text encodings recognised by the binary I/O helpers.
 *
 * - `"latin1"` — ISO-8859-1 single-byte encoding (ID3v2.3 default).
 * - `"utf8"` — UTF-8 (ID3v2.4, FLAC Vorbis Comment, MP4 atoms).
 * - `"utf16le"` — UTF-16 little-endian without BOM.
 * - `"utf16be"` — UTF-16 big-endian without BOM (handled via `TextDecoder`).
 * - `"utf16"` — UTF-16 with a leading BOM (ID3v2.3 text encoding `0x01`).
 * - `"ascii"` — 7-bit ASCII; bytes >= 0x80 are masked to 0.
 */
export type TextEncoding = "latin1" | "utf8" | "utf16le" | "utf16be" | "utf16" | "ascii";
