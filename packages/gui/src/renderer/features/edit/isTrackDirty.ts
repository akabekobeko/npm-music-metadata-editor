import type { LyricsInfo, PictureInfo, TagData, Track } from "../../../main/ipc/types.js";

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
 * Compare two picture lists by structural identity rather than byte equality.
 *
 * Comparing the raw `data` arrays element-wise scales with image size, so we
 * settle for `byteLength` + `kind` + `mimeType` + `description`. The corner
 * case (replacing a picture with byte-equal content under a different
 * description) is acceptable because the dialog shows the change before
 * Apply.
 *
 * @param a - First picture list.
 * @param b - Second picture list.
 * @returns `true` when both lists share the same length and each entry has
 *   matching kind / mime / description / byte length.
 */
const arePicturesEqual = (a: readonly PictureInfo[], b: readonly PictureInfo[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((picture, index) => {
    const other = b[index];
    if (other === undefined) {
      return false;
    }

    return (
      picture.kind === other.kind &&
      picture.mimeType === other.mimeType &&
      (picture.description ?? "") === (other.description ?? "") &&
      picture.data.byteLength === other.data.byteLength
    );
  });
};

/**
 * Compare two `synchronized` arrays by entry-wise field equality.
 *
 * @param a - First synchronized list.
 * @param b - Second synchronized list.
 * @returns `true` when both lists contain the same `(timeMs, text)` pairs in
 *   the same order.
 */
const areSyncedLinesEqual = (
  a: NonNullable<LyricsInfo["synchronized"]>,
  b: NonNullable<LyricsInfo["synchronized"]>,
): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((line, index) => {
    const other = b[index];
    return other !== undefined && line.timeMs === other.timeMs && line.text === other.text;
  });
};

/**
 * Compare two optional `LyricsInfo` blocks for structural equality.
 *
 * `undefined` and an empty `LyricsInfo` are considered equal because the
 * dialog collapses empty fields to `undefined` (see
 * `buildLyricsInfoFromDraft`). Without this loosening, opening and applying a
 * dialog without changes would leave the row dirty.
 *
 * @param a - First lyrics block.
 * @param b - Second lyrics block.
 * @returns `true` when both blocks describe the same payload.
 */
const areLyricsEqual = (a: LyricsInfo | undefined, b: LyricsInfo | undefined): boolean => {
  if (a === b) {
    return true;
  }

  const left = a ?? {};
  const right = b ?? {};
  if ((left.language ?? "") !== (right.language ?? "")) {
    return false;
  }

  if ((left.description ?? "") !== (right.description ?? "")) {
    return false;
  }

  if ((left.unsynchronized ?? "") !== (right.unsynchronized ?? "")) {
    return false;
  }

  return areSyncedLinesEqual(left.synchronized ?? [], right.synchronized ?? []);
};

/**
 * Decide whether a track's editable surface differs from its origin snapshot.
 *
 * Compares the editable subset of {@link Track}: `tag`, `pictures`, and
 * `lyrics`. Chapters are not part of the comparison because the dialog UI
 * does not let the user mutate them.
 *
 * @param track - Latest in-memory track (post-edit).
 * @param origin - Snapshot returned by core at load time.
 * @returns `true` when the user has made changes that need saving.
 */
export const isTrackDirty = (track: Track, origin: Track): boolean => {
  if (!areTagsEqual(track.tag, origin.tag)) {
    return true;
  }

  if (!arePicturesEqual(track.pictures, origin.pictures)) {
    return true;
  }

  return !areLyricsEqual(track.lyrics, origin.lyrics);
};
