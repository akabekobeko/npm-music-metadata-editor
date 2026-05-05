/**
 * One synchronized lyric line, mirroring core's `SynchronizedLyric` shape but
 * without the `readonly` indirection through the IPC type re-exports — the
 * Renderer-side draft state is mutated through `useReducer` updates and copying
 * the structure here keeps this module independent from `main/ipc/types`.
 */
export type SyncedLine = {
  readonly timeMs: number;
  readonly text: string;
};

/**
 * Modal-local draft for the lyrics dialog.
 *
 * Strings are kept as bare `string` (never `undefined`) so the form inputs can
 * bind to them without nullish guards; `buildLyricsInfoFromDraft` collapses
 * empty values back to `undefined` when committing into a `LyricsInfo`.
 */
export type LyricsDraft = {
  /** ISO-639 language code (e.g. `"eng"`). */
  readonly language: string;
  /** Free-form description tied to both lyric forms. */
  readonly description: string;
  /** Plain-text lyrics (may contain newlines). */
  readonly unsynchronized: string;
  /** Synchronized lines sorted by `timeMs` ASC. */
  readonly synchronized: readonly SyncedLine[];
};

/**
 * Result of parsing an LRC document.
 *
 * `meta` holds metadata tags (`[ar:..]`, `[ti:..]`, ...) keyed by the
 * lower-cased tag name; the dialog ignores them in v1 but keeping them here
 * lets a future iteration surface them in the UI without changing the parser.
 */
export type ParsedLrc = {
  readonly lines: readonly SyncedLine[];
  readonly meta: Readonly<Record<string, string>>;
};
