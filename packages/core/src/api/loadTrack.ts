import type { ReadOptions, Track } from "../types.js";
import { readMetadata } from "./readMetadata.js";

/**
 * Load a track from a file path or in-memory bytes.
 *
 * Convenience wrapper over {@link readMetadata} that produces a {@link Track}
 * Object with stable defaults (`additionalFields` and `warnings` are always
 * present, `pictures` / `chapters` are always arrays). Edits are made by
 * spreading the returned `Track` and passing it to `saveTrack`.
 *
 * @param input - File path (`string`) or in-memory bytes (`Uint8Array`).
 * @param options - Reader hints forwarded to {@link readMetadata}.
 * @returns The loaded track.
 * @throws {@link MmeError} on unsupported / undetectable formats.
 */
export const loadTrack = async (
  input: string | Uint8Array,
  options?: ReadOptions,
): Promise<Track> => {
  const result = await readMetadata(input, options);
  return {
    audioFormat: result.audioFormat,
    ...(result.durationMs === undefined ? {} : { durationMs: result.durationMs }),
    tag: result.tag,
    pictures: result.pictures,
    chapters: result.chapters,
    ...(result.lyrics === undefined ? {} : { lyrics: result.lyrics }),
    additionalFields: result.additionalFields ?? {},
    warnings: result.warnings ?? [],
  };
};
