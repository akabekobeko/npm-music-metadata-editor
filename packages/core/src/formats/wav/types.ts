/**
 * One entry inside a `LIST/INFO` chunk.
 *
 * Each entry is a 4-character latin1 key (e.g. `"INAM"`, `"IART"`) plus a
 * UTF-8-encoded text value. Values are stored as decoded strings; the writer
 * adds the trailing null terminator and word-alignment padding.
 */
export type WavInfoEntry = {
  /** 4-character INFO sub-chunk identifier. */
  key: string;
  /** Decoded text value (without the trailing null terminator). */
  value: string;
};
