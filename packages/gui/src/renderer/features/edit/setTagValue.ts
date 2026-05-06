import type { TagData, Track } from "@mme/ipc";
import type { TrackRow } from "../tracks/types.js";
import { isTrackDirty } from "./isTrackDirty.js";

type Args = {
  /** Row whose tag is being patched. */
  readonly row: TrackRow;
  /** `TagData` field to update. */
  readonly field: keyof TagData;
  /** New value, or `undefined` to clear the tag. */
  readonly value: string | number | undefined;
};

/**
 * Return a copy of `row` with one tag field updated and `dirty` recomputed
 * against the row's origin snapshot.
 *
 * `value === undefined` removes the field from the tag object; storing
 * `undefined` would round-trip differently across IPC than an absent key.
 *
 * @returns A new {@link TrackRow}; the input is not mutated.
 */
export const setTagValue = ({ row, field, value }: Args): TrackRow => {
  const nextTag: TagData = { ...row.track.tag };
  if (value === undefined) {
    delete (nextTag as Record<string, unknown>)[field];
  } else {
    (nextTag as Record<string, string | number | undefined>)[field] = value;
  }

  const nextTrack: Track = { ...row.track, tag: nextTag };
  return {
    ...row,
    track: nextTrack,
    dirty: isTrackDirty(nextTrack, row.origin),
  };
};
