/**
 * Decoded native AIFF metadata chunks (`NAME`, `AUTH`, `(c) `, `ANNO`).
 *
 * Each field is the latin1-decoded text payload of the corresponding chunk
 * (without the optional trailing pad byte). `annotations` holds zero or
 * more values because a file can contain multiple `ANNO` chunks.
 */
export type AiffNativeTags = {
  /** `NAME` chunk text — the track title. */
  name?: string;
  /** `AUTH` chunk text — the author / artist. */
  author?: string;
  /** `(c) ` chunk text — the copyright statement. */
  copyright?: string;
  /** Zero or more `ANNO` chunk texts in file order. */
  annotations: readonly string[];
};
