import type { PictureInfo, PictureKindValue } from "@akabeko/music-metadata-editor";

/** Selection criteria for {@link pickPicture}. */
type Filter = {
  /** When set, restrict candidates to this picture kind. */
  readonly kind?: PictureKindValue;
  /**
   * 0-based index within the candidate set. Defaults to `0`. Combines with
   * `kind` so that the index applies *after* the kind filter, matching how
   * `mme picture extract --kind X --index N` reads.
   */
  readonly index?: number;
};

/**
 * Pick a single picture out of a `Track`'s picture list.
 *
 * - No `kind` and no `index` → the first picture (`pictures[0]`).
 * - `kind` only → the first picture matching that kind.
 * - `index` only → `pictures[index]` (no filtering).
 * - `kind` + `index` → the n-th picture among those of that kind.
 *
 * Returns `undefined` when the resolved candidate set is empty or when
 * `index` is out of range so the caller can decide whether to raise an error
 * or print an info line.
 *
 * @param pictures - Pictures sourced from a `Track`.
 * @param filter - Selection criteria.
 * @returns The matching picture, or `undefined` when nothing applies.
 */
export const pickPicture = (
  pictures: readonly PictureInfo[],
  filter: Filter,
): PictureInfo | undefined => {
  const candidates =
    filter.kind === undefined ? pictures : pictures.filter((p) => p.kind === filter.kind);
  return candidates[filter.index ?? 0];
};
