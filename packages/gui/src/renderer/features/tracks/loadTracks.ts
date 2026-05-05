import type { TrackLoadError, TrackRow } from "./types.js";

/**
 * Outcome of a `loadTracks` call: per-file rows separated from per-file errors.
 */
export type LoadTracksResult = {
  readonly rows: readonly TrackRow[];
  readonly errors: readonly TrackLoadError[];
};

/**
 * Read the given file paths via `window.mme.track.loadMany` and split the
 * response into successful {@link TrackRow}s and per-file errors.
 *
 * The IPC envelope itself can also fail (e.g. main-process crash, NotImplemented
 * during early phases); in that case every input path is reported as failing
 * with the same envelope error so the caller does not silently drop them.
 *
 * @param filePaths - Absolute paths to load.
 * @returns Successful rows and per-file errors. De-duplication of repeated
 *   paths is handled by the tracks reducer (last write wins), not here.
 */
export const loadTracks = async (filePaths: readonly string[]): Promise<LoadTracksResult> => {
  if (filePaths.length === 0) {
    return { rows: [], errors: [] };
  }

  const response = await window.mme.track.loadMany({ filePaths });
  if (!response.ok) {
    const errors = filePaths.map((filePath) => ({ filePath, error: response.error }));
    return { rows: [], errors };
  }

  const rows = response.value.flatMap<TrackRow>((entry) =>
    entry.result.ok
      ? [
          {
            filePath: entry.filePath,
            track: entry.result.value,
            origin: entry.result.value,
            dirty: false,
          },
        ]
      : [],
  );
  const errors = response.value.flatMap<TrackLoadError>((entry) =>
    entry.result.ok ? [] : [{ filePath: entry.filePath, error: entry.result.error }],
  );
  return { rows, errors };
};
