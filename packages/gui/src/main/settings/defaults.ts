import type { AppSettings } from "./types.js";

/**
 * Built-in column ids displayed when the user has not customised anything yet.
 *
 * Mirrors `DEFAULT_VISIBLE_IDS` on the Renderer side, but lives in the Main
 * package because the persisted blob has to be readable before any Renderer
 * code runs (and we keep the IPC types Renderer-agnostic — see
 * `src/main/settings/types.ts`).
 */
const DEFAULT_VISIBLE_IDS: readonly string[] = [
  "fileName",
  "audioFormat",
  "durationMs",
  "tag.title",
  "tag.artist",
  "tag.album",
  "tag.albumArtist",
  "tag.trackNumber",
  "tag.year",
  "tag.genre",
  "pictures",
  "lyrics",
  "warnings",
];

/**
 * Default {@link AppSettings} returned when no `settings.json` exists yet (or
 * when the existing file fails to parse).
 *
 * Re-used by `mergeSettings` as the floor when callers hand in a sparse patch.
 * Keep the object immutable by typing it `as const` via the field-level
 * `readonly` modifiers in {@link AppSettings}.
 */
export const defaultSettings: AppSettings = {
  version: 1,
  columns: {
    visibleIds: DEFAULT_VISIBLE_IDS,
    widths: {},
  },
  window: {
    width: 1280,
    height: 800,
    maximized: false,
  },
  recentFiles: [],
};
