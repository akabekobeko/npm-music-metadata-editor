import type { AppSettings } from "./types.js";

/**
 * Renderer-side fallback used until the first `mme:settings:get` resolves.
 *
 * Mirrors {@link import("../../../main/settings/defaults.js").defaultSettings}
 * but lives in the Renderer package so the value is reachable from React code
 * paths without a Main-only import.
 */
export const defaultSettings: AppSettings = {
  version: 1,
  columns: {
    visibleIds: [
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
    ],
    widths: {},
  },
  window: { width: 1280, height: 800, maximized: false },
  recentFiles: [],
};
