/**
 * One MP4 / ISO BMFF box (atom) located inside a source buffer.
 *
 * Atoms hold offsets into the original buffer instead of slicing payload bytes
 * eagerly. This keeps `mdat` (which can be hundreds of megabytes) cheap to
 * traverse: callers `subarray` on demand when they need the payload.
 *
 * `headerSize` distinguishes the standard 8-byte form from the 16-byte
 * extended-size form (size = 1, followed by a 64-bit `largesize`). Container
 * atoms expose their parsed children; leaf atoms leave `children` undefined.
 */
export type Atom = {
  /** 4-character ASCII type code (e.g. `"moov"`, `"©nam"`, `"data"`). */
  type: string;
  /** Absolute offset of the box header in the source buffer. */
  offset: number;
  /** Total size of the box, including the header. */
  size: number;
  /** Absolute offset where the payload starts (header excluded). */
  payloadOffset: number;
  /** Length of the payload (size minus header size). */
  payloadSize: number;
  /** Number of bytes consumed by the box header (8 or 16). */
  headerSize: number;
  /** Parsed children for container atoms; `undefined` for leaves. */
  children?: readonly Atom[];
};
