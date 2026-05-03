/**
 * One `KEY=VALUE` entry inside a Vorbis Comment block.
 *
 * Keys are case-insensitive per the Vorbis Comment specification, but the
 * exact case used by the source file is preserved so writers can round-trip
 * the original bytes verbatim. Use {@link findVorbisCommentValues} (or
 * similar accessors) when looking up by key.
 */
export type VorbisCommentEntry = {
  /** Field key as it appeared in the source bytes (ASCII, excluding `=`). */
  key: string;
  /** Field value, decoded as UTF-8. */
  value: string;
};

/**
 * Decoded Vorbis Comment block.
 *
 * Vorbis Comments accompany Vorbis-family codecs (Vorbis, Opus) inside OGG
 * pages and are also embedded as a `VORBIS_COMMENT` metadata block inside
 * FLAC files. Phase 5 reuses the same shape from OGG; Phase 3 covers FLAC.
 */
export type VorbisComment = {
  /** Vendor string (typically the encoder library identifier). */
  vendor: string;
  /** Comment entries in the order they were encountered. */
  comments: readonly VorbisCommentEntry[];
};
