/**
 * Extra MP3-specific writer options layered on top of {@link WriteOptions}.
 *
 * Stored on `WriteOptions` itself via TypeScript's structural typing — callers
 * can pass any of these on the same options object they hand to `writeMetadata`.
 */
export type Mp3WriteOptions = {
  /**
   * Append (or refresh) an ID3v1 trailer in addition to the ID3v2 head tag.
   *
   * Defaults to `true` when an ID3v1 tag was present in the input, otherwise
   * `false`. Pass an explicit boolean to override either way.
   */
  includeId3v1?: boolean;
  /** ID3v2 major version to emit (`3` or `4`). Defaults to `3` for compatibility. */
  id3v2MajorVersion?: 3 | 4;
};
