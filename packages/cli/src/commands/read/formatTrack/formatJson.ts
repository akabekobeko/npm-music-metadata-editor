import type { Track } from "@akabeko/music-metadata-editor";
import type { TrackSection } from "../types.js";
import { sanitizePictures } from "./sanitizePictures.js";
import type { SectionMask, SerializableTrack } from "./types.js";

/** Arguments accepted by {@link formatJson}. */
type Args = {
  /** Source `Track`. */
  readonly track: Track;
  /** Sections selected for output. Sections absent from the mask are dropped. */
  readonly mask: SectionMask;
};

/**
 * Build the JSON payload from a `Track`, honoring an `--include` / `--exclude`
 * mask.
 *
 * Each top-level section (`audioFormat`, `tag`, ...) is emitted only when it
 * is in {@link Args.mask}. `pictures[]` is always sanitised
 * via {@link sanitizePictures}; the optional `lyrics` / `durationMs` are
 * elided entirely when the source `Track` does not have them.
 *
 * @returns A Plain Object suitable for `JSON.stringify`.
 */
export const formatJson = ({ track, mask }: Args): SerializableTrack => {
  const include = (section: TrackSection): boolean => mask.has(section);

  return {
    ...(include("audioFormat") ? { audioFormat: track.audioFormat } : {}),
    ...(include("durationMs") && track.durationMs !== undefined
      ? { durationMs: track.durationMs }
      : {}),
    ...(include("tag") ? { tag: track.tag } : {}),
    ...(include("pictures") ? { pictures: sanitizePictures(track.pictures) } : {}),
    ...(include("chapters") ? { chapters: track.chapters } : {}),
    ...(include("lyrics") && track.lyrics !== undefined ? { lyrics: track.lyrics } : {}),
    ...(include("additionalFields") ? { additionalFields: track.additionalFields } : {}),
    ...(include("warnings") ? { warnings: track.warnings } : {}),
  } as SerializableTrack;
};
