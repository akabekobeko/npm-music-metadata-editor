import type { PictureInfo, Track } from "../../../main/ipc/types.js";
import type { TrackRow } from "../tracks/types.js";
import { isTrackDirty } from "./isTrackDirty.js";

type Args = {
  /** Row whose pictures are being replaced. */
  readonly row: TrackRow;
  /** Replacement picture list. */
  readonly pictures: readonly PictureInfo[];
};

/**
 * Return a copy of `row` whose `track.pictures` is replaced wholesale.
 *
 * Mirrors {@link setTagValue} — produces a fresh `Track` and a fresh
 * `TrackRow` so React picks up the change via reference identity, and
 * recomputes `dirty` against the row's origin snapshot.
 *
 * @returns A new {@link TrackRow}; the input is not mutated.
 */
export const setPictures = ({ row, pictures }: Args): TrackRow => {
  const nextTrack: Track = { ...row.track, pictures };
  return {
    ...row,
    track: nextTrack,
    dirty: isTrackDirty(nextTrack, row.origin),
  };
};
