import type { TagData, Track } from "../../../main/ipc/types.js";

/**
 * Compare every key present in either tag object.
 *
 * `TagData` only carries primitive values, so a direct `!==` per key is enough
 * — no need for deep equality. The key union is built from both sides so a
 * field that was set in `origin` and then deleted by an edit still flips the
 * result to "different".
 *
 * @param a - First tag object.
 * @param b - Second tag object.
 * @returns `true` when every key in either object compares equal.
 */
const areTagsEqual = (a: TagData, b: TagData): boolean => {
  const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) {
      return false;
    }
  }

  return true;
};

/**
 * Decide whether a track's editable surface differs from its origin snapshot.
 *
 * Phase 4 only mutates `tag`; pictures / chapters / lyrics never change in
 * memory yet, so comparing them would just add noise. Subsequent phases that
 * introduce picture/lyric edits widen this comparison.
 *
 * @param track - Latest in-memory track (post-edit).
 * @param origin - Snapshot returned by core at load time.
 * @returns `true` when the user has made changes that need saving.
 */
export const isTrackDirty = (track: Track, origin: Track): boolean =>
  !areTagsEqual(track.tag, origin.tag);
