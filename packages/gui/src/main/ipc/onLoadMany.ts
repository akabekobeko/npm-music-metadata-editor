import { loadTrack } from "@akabeko/music-metadata-editor";
import type { IpcResult, LoadManyEntry } from "./types.js";
import { createSemaphore } from "./utils/semaphore.js";
import { toIpcError } from "./utils/toIpcError.js";

/**
 * Maximum concurrent `loadTrack` calls inside a single `mme:track:loadMany` request.
 *
 * Capped at 8 to avoid exhausting the per-process file-descriptor budget when
 * Renderer drops a folder of hundreds of tracks at once. Empirically chosen —
 * if profiling shows the disk is idle, it can be lifted, but `Promise.all` of
 * an unbounded list is what we are protecting against.
 */
const LOAD_MANY_CONCURRENCY = 8;

/**
 * Channel handler for `mme:track:loadMany`.
 *
 * Loads each file via core's `loadTrack` while bounding parallelism with a
 * small semaphore. Per-file failures are isolated: a single bad file produces
 * an `{ ok: false }` entry instead of poisoning the whole batch. The outer
 * response is `ok: true` whenever the request itself was processed; the inner
 * per-file results are where partial failures appear.
 *
 * @param _ev - Electron event object (unused).
 * @param request - List of absolute file paths to load.
 * @returns Per-file outcome, in the same order as `filePaths`.
 */
export const onLoadMany = async (
  _ev: Electron.IpcMainInvokeEvent,
  request: { filePaths: readonly string[] },
): Promise<IpcResult<readonly LoadManyEntry[]>> => {
  const semaphore = createSemaphore(LOAD_MANY_CONCURRENCY);

  const entries: readonly LoadManyEntry[] = await Promise.all(
    request.filePaths.map(
      (filePath): Promise<LoadManyEntry> =>
        semaphore.run(async () => {
          try {
            const track = await loadTrack(filePath);
            return { filePath, result: { ok: true, value: track } };
          } catch (error) {
            const ipcError = toIpcError(error);
            console.error("[mme:track:loadMany]", filePath, ipcError);
            return { filePath, result: { ok: false, error: ipcError } };
          }
        }),
    ),
  );

  return { ok: true, value: entries };
};
