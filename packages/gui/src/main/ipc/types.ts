import type {
  AudioFormat,
  ChapterInfo,
  LyricsInfo,
  PictureInfo,
  TagData,
  Track,
  Warning,
} from "@akabeko/music-metadata-editor";

/**
 * Persisted user preferences. Lives in `<userData>/settings.json`; only Main
 * touches the file directly. Defined here (the shared IPC types module)
 * because both Main and Renderer reference the shape on either end of the
 * `mme:settings:get` / `mme:settings:set` channels.
 *
 * `version` is the schema generation; bumping it means the next release ships
 * a `migrate(v1 → vN)` step. v1 keeps the surface intentionally narrow so
 * that migration hooks exist before they are needed.
 */
export type AppSettings = {
  /** Schema generation; bump to enable a future migration step. */
  readonly version: 1;
  /** Spreadsheet column visibility and width preferences. */
  readonly columns: {
    /** Visible column ids in display order. `fileName` is always present. */
    readonly visibleIds: readonly string[];
    /** Column widths in pixels keyed by column id. Missing keys fall back to the registry default. */
    readonly widths: Readonly<Record<string, number>>;
  };
  /** Last-known window geometry — restored at app launch. */
  readonly window: {
    /** Window width in pixels. */
    readonly width: number;
    /** Window height in pixels. */
    readonly height: number;
    /** Whether the window was maximized when last closed. */
    readonly maximized: boolean;
  };
  /** Most-recently-opened file paths. Newest first, capped at 10. */
  readonly recentFiles: readonly string[];
  /** UI language. Unset means "follow `app.getLocale()` and fall back to en". */
  readonly locale?: "en" | "ja";
  /** Color theme. Unset (or `"system"`) means "follow `prefers-color-scheme`". */
  readonly theme?: "light" | "dark" | "system";
};

/**
 * Deeply-partial counterpart of `T`.
 *
 * Used for `mme:settings:set` patches so callers can update a single nested
 * key without echoing the rest of the tree back. Arrays are replaced
 * wholesale — the merge contract is documented on `mergeSettings`.
 */
export type DeepPartial<T> =
  T extends ReadonlyArray<infer U>
    ? ReadonlyArray<U>
    : T extends object
      ? { readonly [K in keyof T]?: DeepPartial<T[K]> }
      : T;

// Re-export the slice of the core type surface that Renderer needs.
//
// Renderer and Preload import these from `../main/ipc/types.js` (type-only)
// rather than from `@akabeko/music-metadata-editor` directly, so the only
// process that has a value-level dependency on the library is Main.

export type { AudioFormat, ChapterInfo, LyricsInfo, PictureInfo, TagData, Track, Warning };

/**
 * Plain-object form of an `Error` that survives Electron's structured clone
 * across IPC. Always use this in IPC responses; never throw across the bridge.
 */
export type IpcError = {
  /** Error class name (e.g., `"Error"`, `"TypeError"`). */
  readonly name: string;
  /** Optional Node-style error code (e.g., `"ENOENT"`). */
  readonly code?: string;
  /** Human-readable error message. */
  readonly message: string;
};

/**
 * Discriminated union returned by every IPC handler that may fail.
 *
 * Mirrors a Result type so Renderer code can branch on `ok` without `try`/`catch`
 * around `ipcRenderer.invoke`. The error payload uses {@link IpcError}, never a
 * raw `Error` instance, because `Error` does not survive structured cloning.
 */
export type IpcResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: IpcError };

/**
 * Versions of the runtime stack reported by `mme:app:getVersions`.
 *
 * `core` is the version of `@akabeko/music-metadata-editor`; `gui` is the
 * Electron app's own `package.json` version. The remaining fields mirror
 * `process.versions` for support / bug-report purposes.
 */
export type AppVersions = {
  /** Version of `@akabeko/music-metadata-editor`. */
  readonly core: string;
  /** Version of the Electron GUI app's own `package.json`. */
  readonly gui: string;
  /** Version of the bundled Electron runtime. */
  readonly electron: string;
  /** Version of the bundled Chromium runtime. */
  readonly chrome: string;
  /** Version of the bundled Node runtime. */
  readonly node: string;
};

/** Request payload for `mme:dialog:openFiles`. */
export type ShowOpenFilesRequest = {
  /** Whether the picker permits selecting more than one file. */
  readonly multiple?: boolean;
};

/**
 * Filter entry forwarded to `dialog.showSaveDialog`'s `filters` option.
 *
 * Defined locally instead of re-using Electron's `FileFilter` so the type can
 * survive structured-clone IPC and be referenced from Renderer-side code that
 * does not import the `electron` package.
 */
export type SaveFileFilter = {
  /** Human-readable label shown in the dialog (e.g., `"Lyrics"`). */
  readonly name: string;
  /** File extensions associated with this filter, sans dot (e.g., `["lrc"]`). */
  readonly extensions: readonly string[];
};

/** Request payload for `mme:dialog:saveFile`. */
export type ShowSaveFileRequest = {
  /** Pre-filled file name (without directory). */
  readonly defaultFileName?: string;
  /** Save dialog filters; first entry wins as the default extension. */
  readonly filters?: readonly SaveFileFilter[];
};

/**
 * Successful payload of `mme:dialog:saveFile`.
 *
 * `null` indicates a user-cancelled dialog so callers can short-circuit
 * without inspecting the wider `IpcResult.ok === false` failure path.
 */
export type ShowSaveFileOk = {
  /** Absolute path the user chose. */
  readonly filePath: string;
} | null;

/** Request payload for `mme:file:writeBytes`. */
export type WriteBytesRequest = {
  /** Absolute destination path. */
  readonly filePath: string;
  /** Bytes to write atomically. */
  readonly bytes: Uint8Array;
};

/** Request payload for `mme:file:readBytes`. */
export type ReadBytesRequest = {
  /** Absolute source path. */
  readonly filePath: string;
};

/** Successful payload of `mme:file:readBytes`. */
export type ReadBytesOk = {
  /** Absolute path that was read; echoed back to correlate batch reads. */
  readonly filePath: string;
  /** File contents. */
  readonly bytes: Uint8Array;
};

/**
 * Successful payload of `mme:track:load`.
 *
 * Carries the resolved file path back so Renderer can correlate the request
 * even when several loads run in parallel.
 */
export type LoadTrackOk = {
  /** Absolute path that was loaded; echoed back to correlate parallel loads. */
  readonly filePath: string;
  /** Parsed track metadata. */
  readonly track: Track;
};

/**
 * Per-file outcome inside a `mme:track:loadMany` response.
 *
 * Each entry pairs the input path with its individual {@link IpcResult} so a
 * single bad file does not poison the rest of the batch.
 */
export type LoadManyEntry = {
  /** Absolute path of this batch entry. */
  readonly filePath: string;
  /** Per-file outcome — failures are isolated to this entry. */
  readonly result: IpcResult<Track>;
};

/**
 * Request payload for `mme:track:save`.
 *
 * `tag` is `Partial<TagData>` because callers can patch a subset of fields;
 * unspecified fields are preserved by the underlying `writeMetadata`.
 */
export type SaveTrackRequest = {
  /** Absolute path of the file to update. */
  readonly filePath: string;
  /** Tag fields to persist; unspecified keys are preserved. */
  readonly tag: Partial<TagData>;
  /** New picture set; omit to leave existing pictures untouched. */
  readonly pictures?: readonly PictureInfo[];
  /** New chapter list; omit to leave existing chapters untouched. */
  readonly chapters?: readonly ChapterInfo[];
  /** New lyrics payload; omit to leave existing lyrics untouched. */
  readonly lyrics?: LyricsInfo;
};

/**
 * Successful payload of `mme:track:save`.
 *
 * `warnings` carries non-fatal diagnostics (e.g. dropped fields) collected
 * while the file was rebuilt.
 */
export type SaveTrackOk = {
  /** Absolute path that was saved; echoed for correlation. */
  readonly filePath: string;
  /** Non-fatal diagnostics collected during the rebuild (e.g., dropped fields). */
  readonly warnings: readonly Warning[];
};

/**
 * One row of the `mme:formatSupport:list` response.
 *
 * Encodes the editing capabilities of a given {@link AudioFormat}: which
 * `tag` fields are writable, and whether the format can carry pictures /
 * chapters / lyrics. Renderer uses it to gray out fields that the target
 * format cannot represent.
 */
export type FormatSupportEntry = {
  /** Audio format this entry describes. */
  readonly format: AudioFormat;
  /** Names of `TagData` fields the format can persist. */
  readonly writableTagFields: ReadonlyArray<keyof TagData>;
  /** Whether the format can carry embedded pictures. */
  readonly supportsPictures: boolean;
  /** Whether the format can carry chapter markers. */
  readonly supportsChapters: boolean;
  /** Whether the format can carry lyrics. */
  readonly supportsLyrics: boolean;
};

/**
 * Request payload for `mme:settings:set`.
 *
 * Patches are deeply-partial so callers can update one nested key without
 * round-tripping the rest of the tree. Arrays inside the patch replace
 * wholesale — see `mergeSettings`.
 */
export type SetSettingsRequest = {
  /** Deeply-partial settings patch; arrays inside the patch replace wholesale. */
  readonly patch: DeepPartial<AppSettings>;
};

/**
 * Payload of the Main → Renderer save-progress notification.
 *
 * Emitted on `mme:progress:save` once when the Main handler is about to call
 * core's `saveTrack` (`phase: "writing"`) and once after it returns (`phase:
 * "done"`). The Renderer aggregates these per-file events with its own
 * `current/total` counters from the `saveDirtyRows` loop to drive the modal
 * progress bar.
 */
export type ProgressSavePayload = {
  /** File the notification is about. */
  readonly filePath: string;
  /** Lifecycle stage of this file's save — `"writing"` brackets the core call. */
  readonly phase: "start" | "writing" | "done";
};

/**
 * Subscribe to progress notifications.
 *
 * @returns Unsubscribe function. Calling it detaches the listener.
 */
export type ProgressSaveSubscriber = (
  listener: (payload: ProgressSavePayload) => void,
) => () => void;

/**
 * Snapshot of menu-relevant state pushed by the Renderer through
 * `mme:menu:setState`.
 *
 * The Main process re-installs the application menu every time this
 * channel is invoked. Static slots (`isMac`, `isDev`, `websiteUrl`) are
 * filled in by Main itself, so the Renderer only sends the parts that
 * change at runtime.
 */
export type MenuStateSnapshot = {
  /** Whether the workspace has unsaved edits — gates Save / Discard items. */
  readonly hasDirty: boolean;
  /** Most-recently-opened file paths, newest first; drives the Recent submenu. */
  readonly recentFiles: readonly string[];
  /** Resolved color theme — drives the toggle item's check state. */
  readonly theme: "light" | "dark";
  /** Visible / hidden state of every spreadsheet column for the Columns submenu. */
  readonly columns: ReadonlyArray<{
    /** Column id — matches the registry. */
    readonly id: string;
    /** Localised label shown in the menu. */
    readonly label: string;
    /** Whether the column is currently visible in the grid. */
    readonly visible: boolean;
  }>;
};

/**
 * Identifier of a native menu item routed through `mme:menu:action`.
 *
 * Main owns the Electron `Menu`; per-action work (Open Files, Save All, …)
 * runs in the Renderer because that is where the application state lives.
 * Adding a new menu item means extending this union plus the matching
 * Renderer dispatch.
 */
export type MenuAction =
  | "openFiles"
  | "openRecent"
  | "saveSelected"
  | "saveAll"
  | "discardChanges"
  | "closeAll"
  | "selectAll"
  | "toggleColumn"
  | "toggleTheme"
  | "showAbout";

/**
 * Payload of `mme:menu:action`.
 *
 * `data` is action-specific (currently used by `openRecent` to carry the file
 * path and by `toggleColumn` to carry the column id), so it stays loosely
 * typed at the IPC boundary; consumers narrow it on the action discriminant.
 */
export type MenuActionPayload = {
  /** Identifier of the menu item that fired. */
  readonly action: MenuAction;
  /** Action-specific payload — narrowed by the consumer on the action discriminant. */
  readonly data?: unknown;
};

/**
 * Subscribe to menu-action events from Main.
 *
 * @returns Unsubscribe function.
 */
export type MenuActionSubscriber = (listener: (payload: MenuActionPayload) => void) => () => void;

/**
 * Payload of `mme:fatal`.
 *
 * Surfaced when Main's `uncaughtException` / `unhandledRejection` fire, or
 * when the Renderer reports its own `window.onerror`. The Renderer modal
 * expects the same shape from both directions.
 */
export type FatalPayload = {
  /** Process that observed the failure. */
  readonly source: "main" | "renderer";
  /** Error message, already coerced to string. */
  readonly message: string;
  /** Optional stack trace for diagnostics. */
  readonly stack?: string;
};

/**
 * Subscribe to `mme:fatal` notifications.
 *
 * @returns Unsubscribe function.
 */
export type FatalSubscriber = (listener: (payload: FatalPayload) => void) => () => void;

/**
 * Severity of a `mme:log:forward` entry. Mirrors the subset of `console`
 * methods Renderer is allowed to forward.
 */
export type LogLevel = "info" | "warn" | "error";

/** Request payload for `mme:log:forward`. */
export type LogForwardRequest = {
  /** Severity of the entry. */
  readonly level: LogLevel;
  /** Primary log message. */
  readonly message: string;
  /** Optional auxiliary detail (Error stack, JSON snippet, …). */
  readonly detail?: string;
};

/**
 * Successful payload of `mme:dialog:expandPaths`.
 *
 * Returns the absolute audio file paths that survived recursion + filtering.
 * Folder inputs walk up to {@link MAX_DROP_DEPTH} levels deep; file inputs
 * are returned unchanged when their extension matches.
 */
export type ExpandPathsOk = {
  /** Absolute audio file paths that survived recursion + extension filtering. */
  readonly filePaths: readonly string[];
};

/** Request payload for `mme:dialog:expandPaths`. */
export type ExpandPathsRequest = {
  /** Mix of file and directory paths — directories are walked recursively. */
  readonly paths: readonly string[];
};

/**
 * The shape of `window.mme`, exposed via `contextBridge.exposeInMainWorld`.
 *
 * Renderer and Preload both reference this type; only Main implements the
 * underlying handlers. Grouped by resource (`app` / `dialog` / `track` / ...)
 * to keep call sites readable: `window.mme.track.load({ filePath })` instead
 * of a flat catalog of channel names.
 */
export type MmeBridge = {
  /** Static runtime versions exposed synchronously for splash screens. */
  readonly versions: {
    /** Node runtime version. */
    readonly node: string;
    /** Chromium runtime version. */
    readonly chrome: string;
    /** Electron runtime version. */
    readonly electron: string;
  };
  /** App-level metadata channels. */
  readonly app: {
    /** Resolve the full {@link AppVersions} report. */
    readonly getVersions: () => Promise<AppVersions>;
  };
  /** Native dialog wrappers. */
  readonly dialog: {
    /** Show the open-files picker. */
    readonly openFiles: (request?: ShowOpenFilesRequest) => Promise<IpcResult<readonly string[]>>;
    /** Show the save-file picker. */
    readonly saveFile: (request?: ShowSaveFileRequest) => Promise<IpcResult<ShowSaveFileOk>>;
  };
  /** Track load / save channels backed by the core library. */
  readonly track: {
    /** Load a single audio file. */
    readonly load: (request: { filePath: string }) => Promise<IpcResult<LoadTrackOk>>;
    /** Load a batch of audio files; failures are isolated per entry. */
    readonly loadMany: (request: {
      filePaths: readonly string[];
    }) => Promise<IpcResult<readonly LoadManyEntry[]>>;
    /** Persist edits back to disk. */
    readonly save: (request: SaveTrackRequest) => Promise<IpcResult<SaveTrackOk>>;
  };
  /** Raw file I/O for sidecar workflows (LRC import / export, etc.). */
  readonly file: {
    /** Read bytes from disk. */
    readonly readBytes: (request: ReadBytesRequest) => Promise<IpcResult<ReadBytesOk>>;
    /** Write bytes to disk atomically. */
    readonly writeBytes: (request: WriteBytesRequest) => Promise<IpcResult<void>>;
  };
  /** Format-capability metadata used to gate writable cells. */
  readonly formatSupport: {
    /** Enumerate per-format support entries. */
    readonly list: () => Promise<IpcResult<readonly FormatSupportEntry[]>>;
  };
  /** Persisted-settings channels. */
  readonly settings: {
    /** Read the current settings snapshot. */
    readonly get: () => Promise<IpcResult<AppSettings>>;
    /** Apply a deeply-partial patch and return the merged snapshot. */
    readonly set: (request: SetSettingsRequest) => Promise<IpcResult<AppSettings>>;
  };
  /** Long-running progress notifications. */
  readonly progress: {
    /** Subscribe to per-file save progress events. */
    readonly onSave: ProgressSaveSubscriber;
  };
  /** Drag-and-drop helpers. */
  readonly dnd: {
    /** Recursively resolve dropped paths to audio file paths. */
    readonly expandPaths: (request: ExpandPathsRequest) => Promise<IpcResult<ExpandPathsOk>>;
    /**
     * Resolve the absolute filesystem path of a `File` produced by HTML drag
     * & drop. Wraps Electron's `webUtils.getPathForFile`, which is the only
     * supported way to get a path from a Renderer-constructed `File` since
     * `File.path` was removed.
     */
    readonly pathFor: (file: File) => string;
  };
  /** Native application-menu channels. */
  readonly menu: {
    /** Subscribe to menu-action events fired by Main. */
    readonly onAction: MenuActionSubscriber;
    /** Push the latest menu-relevant state so Main can rebuild the menu. */
    readonly setState: (snapshot: MenuStateSnapshot) => void;
  };
  /** Fatal-error reporting channels. */
  readonly fatal: {
    /** Subscribe to fatal-error notifications from Main. */
    readonly onError: FatalSubscriber;
    /** Report a Renderer-side fatal error to Main. */
    readonly report: (payload: FatalPayload) => void;
  };
  /** Log-forwarding channel for Renderer `console` output. */
  readonly log: {
    /** Forward a single log entry to Main's logger. */
    readonly forward: (request: LogForwardRequest) => void;
  };
};
