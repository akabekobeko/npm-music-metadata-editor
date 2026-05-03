import type { ChapterInfo } from "@akabeko/music-metadata-editor";
import { CommanderError } from "commander";

/**
 * Throw a commander usage error so the bin layer maps it to exit code `2`.
 *
 * @param message - User-facing error message.
 * @returns Never; always throws.
 */
const usageError = (message: string): never => {
  throw new CommanderError(2, "mme.usageError", message);
};

/**
 * Validate that a `ChapterInfo` value satisfies the per-chapter invariants
 * documented in Phase 4: presence of `id`, finite `startMs` / `endMs`,
 * positive duration.
 *
 * Per-element checks live here so {@link validateChapters} can focus on the
 * cross-element relationships (ordering and uniqueness).
 *
 * @param chapter - A single chapter.
 * @param where - Index label (`chapters[N]`) for error messages.
 */
const checkChapter = (chapter: ChapterInfo, where: string): void => {
  if (typeof chapter.id !== "string" || chapter.id === "") {
    usageError(`${where}: "id" must be a non-empty string`);
  }

  if (typeof chapter.startMs !== "number" || !Number.isFinite(chapter.startMs)) {
    usageError(`${where}: "startMs" must be a finite number`);
  }

  if (typeof chapter.endMs !== "number" || !Number.isFinite(chapter.endMs)) {
    usageError(`${where}: "endMs" must be a finite number`);
  }

  if (chapter.endMs <= chapter.startMs) {
    usageError(
      `${where}: "endMs" (${chapter.endMs}) must be greater than "startMs" (${chapter.startMs})`,
    );
  }
};

/**
 * Validate a chapter list against the Phase 4 contract.
 *
 * Rules enforced:
 *
 * - Per-chapter shape: non-empty `id`, finite `startMs` / `endMs`,
 *   `endMs > startMs`.
 * - Strict monotonic increase of `startMs` (later chapter's start is
 *   strictly greater than the previous one's). Equality is rejected because
 *   ID3v2 readers / writers cannot disambiguate same-anchor chapters.
 * - Globally unique `id` values.
 *
 * Empty arrays are accepted — they are a valid representation of "no
 * chapters" and `setChapter` uses them to wipe the list. Errors throw a
 * {@link CommanderError} (`exitCode = 2`) so the CLI surfaces a usage
 * failure rather than a generic crash.
 *
 * @param chapters - Chapters to validate (typically parsed from `--json`).
 * @throws {@link CommanderError} on the first violation.
 */
export const validateChapters = (chapters: readonly ChapterInfo[]): void => {
  const seenIds = new Set<string>();
  let prevStart = Number.NEGATIVE_INFINITY;

  chapters.forEach((chapter, i) => {
    const where = `chapters[${i}]`;
    checkChapter(chapter, where);
    if (chapter.startMs <= prevStart) {
      usageError(
        `${where}: "startMs" (${chapter.startMs}) must be greater than the previous chapter's "startMs" (${prevStart})`,
      );
    }

    if (seenIds.has(chapter.id)) {
      usageError(`${where}: duplicate "id" value "${chapter.id}"`);
    }

    seenIds.add(chapter.id);
    prevStart = chapter.startMs;
  });
};
