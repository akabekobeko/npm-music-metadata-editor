import type { Stats } from "node:fs";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { AUDIO_EXTENSIONS, MAX_DROP_DEPTH, MIN_DROP_DEPTH } from "./constants.js";

/** Args for {@link expandDroppedPaths}. */
type Args = {
  /** Absolute paths the user dropped on the renderer (files or directories). */
  readonly paths: readonly string[];
  /** Override for the recursion limit; falls back to {@link MAX_DROP_DEPTH}. */
  readonly maxDepth?: number;
};

/**
 * Resolve a list of dropped paths into absolute audio file paths.
 *
 * Behaviour, mirroring the Phase 7 plan:
 *
 * - Files keep their original path when their lower-case extension is in
 *   {@link AUDIO_EXTENSIONS}; non-audio files are dropped.
 * - Directories walk recursively up to `maxDepth` levels deep
 *   ({@link MAX_DROP_DEPTH} by default) and emit every contained audio file.
 *   Anything deeper is silently skipped.
 * - **Symbolic links are skipped entirely** (`lstat` is used so the link
 *   target is never followed). This matches the security review baseline:
 *   D&D from a hostile filesystem mount cannot trick the walker into reading
 *   `/etc/passwd` or similar.
 * - Unreadable entries (permission denied, race against deletion) are
 *   skipped without aborting the whole expansion.
 *
 * The result is **deduplicated** while preserving first-seen order so the
 * caller's "later wins" semantics from `loadMany` still apply when several
 * sibling drops contain the same path.
 *
 * Implementation note: `collect` / `pushIfAudio` are nested closures that
 * share the dedup set + result list through lexical scope. This keeps each
 * helper at ≤ 2 parameters (matching the project's `useMaxParams: 2` Biome
 * rule) without spreading state through an extra Args type.
 *
 * @param args - Dropped paths and optional depth override.
 * @returns Absolute audio file paths in deterministic order.
 */
export const expandDroppedPaths = async ({
  paths,
  maxDepth = MAX_DROP_DEPTH,
}: Args): Promise<readonly string[]> => {
  const limit = Math.max(MIN_DROP_DEPTH, Math.floor(maxDepth));
  const seen = new Set<string>();
  const results: string[] = [];

  const pushIfAudio = (filePath: string): void => {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    if (!AUDIO_EXTENSIONS.has(ext) || seen.has(filePath)) {
      return;
    }

    seen.add(filePath);
    results.push(filePath);
  };

  const safeLstat = async (target: string): Promise<Stats | null> => {
    try {
      return await lstat(target);
    } catch {
      return null;
    }
  };

  const collect = async (target: string, depth: number): Promise<void> => {
    const stat = await safeLstat(target);
    if (stat === null || stat.isSymbolicLink()) {
      return;
    }

    if (stat.isFile()) {
      pushIfAudio(target);
      return;
    }

    if (!stat.isDirectory()) {
      return;
    }

    let entries: readonly string[];
    try {
      entries = await readdir(target);
    } catch {
      return;
    }

    const sorted = [...entries].sort();
    for (const name of sorted) {
      const child = path.join(target, name);
      const childStat = await safeLstat(child);
      if (childStat === null || childStat.isSymbolicLink()) {
        continue;
      }

      if (childStat.isFile()) {
        pushIfAudio(child);
        continue;
      }

      if (childStat.isDirectory() && depth + 1 <= limit) {
        await collect(child, depth + 1);
      }
    }
  };

  for (const inputPath of paths) {
    await collect(inputPath, 0);
  }

  return results;
};
