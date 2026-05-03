import { writeFileBuffer } from "../io/file.js";
import type { SaveTrackOptions, Track, WriteOptions } from "../types.js";
import { writeMetadata } from "./writeMetadata.js";

/**
 * Persist a modified {@link Track}.
 *
 * Behaviour by `options.source` / `options.outputPath`:
 * - `source: string` and no `outputPath` → overwrite the source path on disk;
 *   resolves to `undefined`.
 * - `source: string` and `outputPath` set → write to `outputPath`; resolves to
 *   `undefined`.
 * - `source: Uint8Array` and `outputPath` set → write to `outputPath`; resolves
 *   to `undefined`.
 * - `source: Uint8Array` and no `outputPath` → resolves to the rebuilt bytes.
 *
 * @param track - The modified track to persist.
 * @param options - Source bytes / path plus optional output path.
 * @returns The rebuilt bytes when no output path was provided; otherwise `undefined`.
 * @throws {@link MmeError} on unsupported / undetectable formats.
 */
export const saveTrack = async (
  track: Track,
  options: SaveTrackOptions,
): Promise<Uint8Array | undefined> => {
  const writeOptions = trackToWriteOptions(track);
  const bytes = await writeMetadata(options.source, writeOptions);
  const outputPath = resolveOutputPath(options);
  if (outputPath !== undefined) {
    await writeFileBuffer(outputPath, bytes);
    return undefined;
  }

  return bytes;
};

/**
 * Project a {@link Track} into the {@link WriteOptions} accepted by `writeMetadata`.
 *
 * The `format` field is forwarded so callers can save back to a different
 * physical container (rare, but supported by the lower-level API).
 *
 * @param track - Track to project.
 * @returns The equivalent `WriteOptions`.
 */
const trackToWriteOptions = (track: Track): WriteOptions => ({
  tag: track.tag,
  pictures: track.pictures,
  chapters: track.chapters,
  ...(track.lyrics === undefined ? {} : { lyrics: track.lyrics }),
  format: track.audioFormat,
});

/**
 * Decide the on-disk destination for {@link saveTrack}.
 *
 * Buffer sources without an explicit `outputPath` skip the disk write entirely
 * and return their rebuilt bytes; string sources default to overwriting in place.
 *
 * @param options - Save options (source plus optional outputPath).
 * @returns The destination path, or `undefined` when no disk write is requested.
 */
const resolveOutputPath = (options: SaveTrackOptions): string | undefined => {
  if (options.outputPath !== undefined) {
    return options.outputPath;
  }

  return typeof options.source === "string" ? options.source : undefined;
};
