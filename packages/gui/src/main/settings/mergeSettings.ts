import { RECENT_FILES_LIMIT } from "./constants.js";
import type { AppSettings, DeepPartial } from "./types.js";

/**
 * Deep-merge a partial patch onto a full {@link AppSettings} value.
 *
 * Merge semantics, picked deliberately so the IPC contract stays predictable:
 *
 * - Plain objects merge recursively (the patch wins on overlapping keys).
 * - Arrays and primitives **replace** the current value — patches of nested
 *   structures must repeat the full array if they want to grow it.
 * - Unknown keys on the patch are ignored (forward-compat with future Renderer
 *   builds talking to an older Main).
 * - The `version` key is **not patchable from outside**: callers always get
 *   back the current version, regardless of what they sent. Migrations belong
 *   in `loadSettingsSync`.
 * - `recentFiles` is capped at {@link RECENT_FILES_LIMIT}; longer arrays are
 *   truncated to the head so callers can blindly prepend without policing the
 *   bound themselves.
 *
 * The returned object is a fresh value — never the same reference as
 * `current`, even when the patch is empty — to make change detection on the
 * caller side a `===` comparison.
 *
 * @param current - The settings as last seen on disk / in memory.
 * @param patch - Partial overrides, deeply applied.
 * @returns The merged settings.
 */
export const mergeSettings = (
  current: AppSettings,
  patch: DeepPartial<AppSettings>,
): AppSettings => ({
  version: current.version,
  columns: mergeColumns(current.columns, patch.columns),
  window: mergeWindow(current.window, patch.window),
  recentFiles: mergeRecentFiles(current.recentFiles, patch.recentFiles),
  ...(patch.locale !== undefined
    ? { locale: patch.locale }
    : current.locale !== undefined
      ? { locale: current.locale }
      : {}),
  ...(patch.theme !== undefined
    ? { theme: patch.theme }
    : current.theme !== undefined
      ? { theme: current.theme }
      : {}),
});

type ColumnsPatch = DeepPartial<AppSettings["columns"]> | undefined;

/**
 * Merge the `columns` slice. `visibleIds` is replaced wholesale (an array);
 * `widths` is shallow-merged so callers can extend just one column's width
 * without re-sending every entry.
 *
 * @param current - Current columns slice.
 * @param patch - Partial overrides for the columns slice.
 * @returns The merged columns slice.
 */
const mergeColumns = (
  current: AppSettings["columns"],
  patch: ColumnsPatch,
): AppSettings["columns"] => {
  if (patch === undefined) {
    return { visibleIds: current.visibleIds, widths: { ...current.widths } };
  }

  const visibleIds = patch.visibleIds ?? current.visibleIds;
  const widths =
    patch.widths === undefined
      ? { ...current.widths }
      : sanitizeWidths({ ...current.widths, ...patch.widths });
  return { visibleIds, widths };
};

type WindowPatch = DeepPartial<AppSettings["window"]> | undefined;

/**
 * Merge the `window` slice with primitive override semantics.
 *
 * @param current - Current window slice.
 * @param patch - Partial overrides for the window slice.
 * @returns The merged window slice.
 */
const mergeWindow = (current: AppSettings["window"], patch: WindowPatch): AppSettings["window"] => {
  if (patch === undefined) {
    return { ...current };
  }

  return {
    width: patch.width ?? current.width,
    height: patch.height ?? current.height,
    maximized: patch.maximized ?? current.maximized,
  };
};

/**
 * Replace `recentFiles` and enforce the {@link RECENT_FILES_LIMIT} cap.
 *
 * Treats `recentFiles` as a fully-replaced list when present so callers stay
 * in control of ordering (newest-first is enforced by the caller, not here).
 *
 * @param current - Current recent-files list.
 * @param patch - Replacement list, or `undefined` to keep the current one.
 * @returns A truncated copy of either the patch or the current list.
 */
const mergeRecentFiles = (
  current: readonly string[],
  patch: readonly string[] | undefined,
): readonly string[] => {
  const next = patch ?? current;
  return next.slice(0, RECENT_FILES_LIMIT);
};

/**
 * Drop column widths that are not finite positive numbers.
 *
 * Renderer callers should pre-validate, but the Main process is the long-lived
 * authority on the file format and must not persist garbage if a malformed
 * patch slips through (e.g. tests, future migrations).
 *
 * @param widths - Width map to scrub.
 * @returns A copy with only finite positive entries retained.
 */
const sanitizeWidths = (
  widths: Readonly<Record<string, number | undefined>>,
): Record<string, number> => {
  const entries: Array<readonly [string, number]> = [];
  for (const [key, value] of Object.entries(widths)) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      entries.push([key, value]);
    }
  }

  return Object.fromEntries(entries);
};
