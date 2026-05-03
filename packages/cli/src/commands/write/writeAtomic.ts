import { randomBytes } from "node:crypto";
import { rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Atomically replace `path` with `bytes` via `tmp + rename`.
 *
 * The temporary file is created in the same directory as the destination so
 * `rename(2)` stays on a single filesystem (cross-device renames would fall
 * back to a copy and lose the atomicity guarantee). On any write failure the
 * temporary file is unlinked best-effort and the original error is re-thrown.
 *
 * Errors from `unlink` during cleanup are swallowed — they only matter when
 * the original write succeeded but `rename` failed, in which case the caller
 * has already lost the operation and a stray tmp file is the lesser evil.
 *
 * @param path - Final destination path.
 * @param bytes - Bytes to persist.
 */
export const writeAtomic = async (path: string, bytes: Uint8Array): Promise<void> => {
  const tmp = join(dirname(path), `.${nameOf(path)}.${randomSuffix()}.tmp`);
  try {
    await writeFile(tmp, bytes);
    await rename(tmp, path);
  } catch (error) {
    await unlink(tmp).catch(() => {});
    throw error;
  }
};

/**
 * Extract the basename of a path without pulling in `node:path/posix`.
 *
 * @param path - Path whose final segment is desired.
 * @returns The trailing path component (e.g. `song.mp3` from `/x/song.mp3`).
 */
const nameOf = (path: string): string => {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return slash < 0 ? path : path.slice(slash + 1);
};

/**
 * Generate a short random suffix for the temp filename.
 *
 * Uses the synchronous `randomBytes` form because the suffix is needed before
 * `writeFile` is even called, and 6 bytes is too small to be worth the
 * additional async hop.
 *
 * @returns A 12-char hex string.
 */
const randomSuffix = (): string => randomBytes(6).toString("hex");
