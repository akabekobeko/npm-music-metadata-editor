import { RECENT_FILES_LIMIT } from "./constants.js";

/**
 * Promote the given paths to the top of `recentFiles`, removing any
 * existing duplicates and keeping the list bounded.
 *
 * Order semantics match macOS's "Open Recent" — the most-recently-touched
 * entry is at index 0, older entries follow, and the list never exceeds
 * {@link RECENT_FILES_LIMIT}. When `paths` itself contains duplicates, the
 * first occurrence wins so the list never collapses to fewer entries than
 * the user just opened.
 *
 * @param current - Existing recent-files list (newest first).
 * @param paths - Paths just opened by the user, in opening order.
 * @returns A new bounded list with `paths` prepended (de-duped).
 */
export const touchRecentFile = (
  current: readonly string[],
  paths: readonly string[],
): readonly string[] => {
  const dedupedNew: readonly string[] = paths.filter(
    (path, index) => paths.indexOf(path) === index,
  );
  const remaining = current.filter((path) => !dedupedNew.includes(path));
  return [...dedupedNew, ...remaining].slice(0, RECENT_FILES_LIMIT);
};
