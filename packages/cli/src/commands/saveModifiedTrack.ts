import { type Track, type WriteOptions, writeMetadata } from "@akabeko/music-metadata-editor";
import { writeAtomic } from "./write/writeAtomic.js";

/**
 * Project a `Track` into the `WriteOptions` shape `writeMetadata` accepts.
 *
 * Mirrors the projection used by `handleWrite` for `mme write` so that the
 * extras subcommands (`picture` / `chapter` / `lyrics`) drive the writer with
 * the same field set: tag, pictures, chapters, lyrics (when set) and the
 * detected audio format.
 *
 * @param track - The post-edit track to persist.
 * @returns The matching `WriteOptions`.
 */
const projectWriteOptions = (track: Track): WriteOptions => ({
  tag: track.tag,
  pictures: track.pictures,
  chapters: track.chapters,
  ...(track.lyrics === undefined ? {} : { lyrics: track.lyrics }),
  format: track.audioFormat,
});

/**
 * Rebuild a track's bytes via `writeMetadata` and atomically replace the
 * source file.
 *
 * Used by every Phase 4 extras subcommand that mutates a single track field
 * (pictures / chapters / lyrics) and writes back in place. Atomicity comes
 * from the same `tmp + rename` helper the `mme write` file branch uses, so
 * partial writes never leave the destination half-rewritten.
 *
 * @param path - Source file to overwrite.
 * @param track - Modified track to persist.
 */
export const saveModifiedTrack = async (path: string, track: Track): Promise<void> => {
  const bytes = await writeMetadata(path, projectWriteOptions(track));
  await writeAtomic(path, bytes);
};
