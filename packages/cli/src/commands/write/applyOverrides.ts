import type { TagData } from "@akabeko/music-metadata-editor";
import type { TagOverrides } from "./types.js";

/** Arguments accepted by {@link applyOverrides}. */
type Args = {
  /** Existing tag values from `loadTrack`. */
  readonly current: TagData;
  /** Mutation produced by `parseTagOverrides`. */
  readonly overrides: TagOverrides;
};

/**
 * Apply a {@link TagOverrides} onto an existing {@link TagData} value.
 *
 * Composition order:
 *
 * 1. When `clearAll` is set, the result starts empty.
 * 2. Otherwise the current tag is copied as the base.
 * 3. Fields listed in `clear` are removed (no-op when already absent).
 * 4. Fields listed in `assign` are written last so they always win.
 *
 * The function never mutates `current`; a fresh object is returned. The
 * spread-based composition mirrors the core writers, which interpret an
 * `undefined` field as "preserve" — making the function safe to chain into
 * `saveTrack` without re-introducing fields the user just cleared.
 *
 * @returns A fresh `TagData` with the mutation applied.
 */
export const applyOverrides = ({ current, overrides }: Args): TagData => {
  const base: TagData = overrides.clearAll ? {} : { ...current };
  overrides.clear.forEach((field) => {
    delete (base as Record<string, unknown>)[field];
  });

  return { ...base, ...overrides.assign };
};
