/**
 * Audio file extensions that survive D&D filtering and the open-file dialog.
 *
 * Mirrors the union of {@link import("@akabeko/music-metadata-editor").AudioFormat}
 * extensions accepted by core. Adding a new format means extending this list
 * — both the open dialog (`onShowOpenFiles.ts`) and the drop expansion
 * (`expandDroppedPaths.ts`) consume it.
 *
 * Stored as lower-case extensions without the leading dot so callers can
 * compare against `path.extname(p).slice(1).toLowerCase()` directly.
 */
export const AUDIO_EXTENSIONS: ReadonlySet<string> = new Set([
  "mp3",
  "flac",
  "m4a",
  "mp4",
  "ogg",
  "opus",
  "wav",
  "aiff",
  "aif",
  "wma",
  "ape",
]);

/** Lower-bound for the `maxDepth` argument so callers can't pass `0`. */
export const MIN_DROP_DEPTH = 1;

/**
 * Default depth the recursive walker honours when a folder is dropped.
 *
 * Three levels matches the Phase 7 plan: enough to handle "artist /
 * album / track" hierarchies that are common in iTunes-style libraries
 * without recursing forever on accidental drops of a home directory.
 */
export const MAX_DROP_DEPTH = 3;
