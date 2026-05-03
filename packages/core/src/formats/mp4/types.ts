import type { PictureInfo, TagData } from "../../types.js";
import type { Atom } from "./atom/types.js";

/**
 * One value held inside a `data` atom.
 *
 * Each iTunes metadata atom (e.g. `©nam`, `trkn`, `----`) contains one or more
 * `data` sub-atoms. We preserve the raw bytes plus the type indicator so the
 * writer can re-emit the atom without lossy conversion when the field is one
 * we do not interpret.
 */
export type ItunesDataValue = {
  /** iTunes well-known type indicator. */
  typeIndicator: number;
  /** Locale (almost always 0). */
  locale: number;
  /** Raw payload bytes (excludes the 8-byte type-indicator + locale prefix). */
  data: Uint8Array;
};

/**
 * One iTunes metadata atom decoded from `ilst`.
 *
 * `name` carries the 4-character atom code (`©nam`, `trkn`, `----`, …). For
 * `----` freeform atoms the parser surfaces the namespace and field code so
 * the writer can rebuild the same shape on output.
 */
export type ItunesAtom = {
  /** 4-character atom type. */
  name: string;
  /** `mean` namespace string when the atom was a `----` freeform. */
  meanNamespace?: string;
  /** `name` field-name string when the atom was a `----` freeform. */
  meanName?: string;
  /** All values extracted from the atom's `data` children, in file order. */
  values: readonly ItunesDataValue[];
};

/**
 * Result of reading the metadata region of an MP4 file.
 *
 * `tag` and `pictures` follow the public {@link TagData} / {@link PictureInfo}
 * shapes; `passThroughAtoms` keep ilst entries we did not interpret so the
 * writer can re-emit them verbatim.
 */
export type ParsedMp4Metadata = {
  /** Common metadata fields. */
  tag: TagData;
  /** Embedded pictures from `covr` atoms. */
  pictures: readonly PictureInfo[];
  /** Original ilst entries, retained for round-trip writing. */
  ilstAtoms: readonly ItunesAtom[];
  /** The `ilst` atom in the parsed tree, when one exists. */
  ilst?: Atom;
};

/**
 * Snapshot of the parsed MP4 file used by the writer to rebuild it.
 *
 * The writer takes the original tree plus the metadata view and produces a
 * fresh file with an updated `moov` and adjusted `stco` / `co64` entries.
 */
export type ParsedMp4 = {
  /** Top-level atoms in file order. */
  tree: readonly Atom[];
  /** Detected metadata. */
  metadata: ParsedMp4Metadata;
  /** The `moov` atom, when present (always present in well-formed files). */
  moov?: Atom;
  /** All chunk offset atoms (both `stco` and `co64`). */
  chunkOffsetAtoms: readonly Atom[];
};
