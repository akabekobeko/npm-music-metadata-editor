import type { LyricsInfo, Track } from "@mme/ipc";
import type { TrackRow } from "../tracks/types.js";
import { isTrackDirty } from "./isTrackDirty.js";

type Args = {
  /** Row whose lyrics are being replaced. */
  readonly row: TrackRow;
  /** Replacement lyrics, or `undefined` to clear them. */
  readonly lyrics: LyricsInfo | undefined;
};

/**
 * Return a copy of `row` whose `track.lyrics` is replaced wholesale.
 *
 * `lyrics === undefined` removes the field from the track object; storing
 * `undefined` would round-trip differently across IPC than an absent key.
 *
 * @returns A new {@link TrackRow}; the input is not mutated.
 */
export const setLyrics = ({ row, lyrics }: Args): TrackRow => {
  const nextTrack: Track = { ...row.track };
  if (lyrics === undefined) {
    delete (nextTrack as { lyrics?: LyricsInfo }).lyrics;
  } else {
    (nextTrack as { lyrics?: LyricsInfo }).lyrics = lyrics;
  }

  return {
    ...row,
    track: nextTrack,
    dirty: isTrackDirty(nextTrack, row.origin),
  };
};
