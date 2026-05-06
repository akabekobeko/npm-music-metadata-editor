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
  readonly version: 1;
  readonly columns: {
    /** Visible column ids in display order. `fileName` is always present. */
    readonly visibleIds: readonly string[];
    /** Column widths in pixels keyed by column id. Missing keys fall back to the registry default. */
    readonly widths: Readonly<Record<string, number>>;
  };
  readonly window: {
    readonly width: number;
    readonly height: number;
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
  readonly name: string;
  readonly code?: string;
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
  readonly core: string;
  readonly gui: string;
  readonly electron: string;
  readonly chrome: string;
  readonly node: string;
};

/** Request payload for `mme:dialog:openFiles`. */
export type ShowOpenFilesRequest = {
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
  readonly name: string;
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
  readonly filePath: string;
} | null;

/** Request payload for `mme:file:writeBytes`. */
export type WriteBytesRequest = {
  readonly filePath: string;
  readonly bytes: Uint8Array;
};

/** Request payload for `mme:file:readBytes`. */
export type ReadBytesRequest = {
  readonly filePath: string;
};

/** Successful payload of `mme:file:readBytes`. */
export type ReadBytesOk = {
  readonly filePath: string;
  readonly bytes: Uint8Array;
};

/**
 * Successful payload of `mme:track:load`.
 *
 * Carries the resolved file path back so Renderer can correlate the request
 * even when several loads run in parallel.
 */
export type LoadTrackOk = {
  readonly filePath: string;
  readonly track: Track;
};

/**
 * Per-file outcome inside a `mme:track:loadMany` response.
 *
 * Each entry pairs the input path with its individual {@link IpcResult} so a
 * single bad file does not poison the rest of the batch.
 */
export type LoadManyEntry = {
  readonly filePath: string;
  readonly result: IpcResult<Track>;
};

/**
 * Request payload for `mme:track:save`.
 *
 * `tag` is `Partial<TagData>` because callers can patch a subset of fields;
 * unspecified fields are preserved by the underlying `writeMetadata`.
 */
export type SaveTrackRequest = {
  readonly filePath: string;
  readonly tag: Partial<TagData>;
  readonly pictures?: readonly PictureInfo[];
  readonly chapters?: readonly ChapterInfo[];
  readonly lyrics?: LyricsInfo;
};

/**
 * Successful payload of `mme:track:save`.
 *
 * `warnings` carries non-fatal diagnostics (e.g. dropped fields) collected
 * while the file was rebuilt.
 */
export type SaveTrackOk = {
  readonly filePath: string;
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
  readonly format: AudioFormat;
  /** Names of `TagData` fields the format can persist. */
  readonly writableTagFields: ReadonlyArray<keyof TagData>;
  readonly supportsPictures: boolean;
  readonly supportsChapters: boolean;
  readonly supportsLyrics: boolean;
};

/**
 * Persisted settings shape exchanged over `mme:settings:get` /
 * `mme:settings:set`.
 *
 * Phase 6 narrows the type to the real {@link AppSettings} schema. The alias
 * is kept for callers (Renderer) that still reference the older name, and as
 * a stable IPC-only surface so further fields can land without dragging
 * Renderer imports through the Main package's internal layout.
 */
export type SettingsSnapshot = AppSettings;

/**
 * Request payload for `mme:settings:set`.
 *
 * Patches are deeply-partial so callers can update one nested key without
 * round-tripping the rest of the tree. Arrays inside the patch replace
 * wholesale — see `mergeSettings`.
 */
export type SetSettingsRequest = {
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
  readonly filePath: string;
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
  readonly hasDirty: boolean;
  readonly recentFiles: readonly string[];
  readonly theme: "light" | "dark";
  readonly columns: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
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
  readonly action: MenuAction;
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
  readonly source: "main" | "renderer";
  readonly message: string;
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
  readonly level: LogLevel;
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
  readonly filePaths: readonly string[];
};

/** Request payload for `mme:dialog:expandPaths`. */
export type ExpandPathsRequest = {
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
  readonly versions: {
    readonly node: string;
    readonly chrome: string;
    readonly electron: string;
  };
  readonly app: {
    readonly getVersions: () => Promise<AppVersions>;
  };
  readonly dialog: {
    readonly openFiles: (request?: ShowOpenFilesRequest) => Promise<IpcResult<readonly string[]>>;
    readonly saveFile: (request?: ShowSaveFileRequest) => Promise<IpcResult<ShowSaveFileOk>>;
  };
  readonly track: {
    readonly load: (request: { filePath: string }) => Promise<IpcResult<LoadTrackOk>>;
    readonly loadMany: (request: {
      filePaths: readonly string[];
    }) => Promise<IpcResult<readonly LoadManyEntry[]>>;
    readonly save: (request: SaveTrackRequest) => Promise<IpcResult<SaveTrackOk>>;
  };
  readonly file: {
    readonly readBytes: (request: ReadBytesRequest) => Promise<IpcResult<ReadBytesOk>>;
    readonly writeBytes: (request: WriteBytesRequest) => Promise<IpcResult<void>>;
  };
  readonly formatSupport: {
    readonly list: () => Promise<IpcResult<readonly FormatSupportEntry[]>>;
  };
  readonly settings: {
    readonly get: () => Promise<IpcResult<SettingsSnapshot>>;
    readonly set: (request: SetSettingsRequest) => Promise<IpcResult<SettingsSnapshot>>;
  };
  readonly progress: {
    readonly onSave: ProgressSaveSubscriber;
  };
  readonly dnd: {
    readonly expandPaths: (request: ExpandPathsRequest) => Promise<IpcResult<ExpandPathsOk>>;
    /**
     * Resolve the absolute filesystem path of a `File` produced by HTML drag
     * & drop. Wraps Electron's `webUtils.getPathForFile`, which is the only
     * supported way to get a path from a Renderer-constructed `File` since
     * `File.path` was removed.
     */
    readonly pathFor: (file: File) => string;
  };
  readonly menu: {
    readonly onAction: MenuActionSubscriber;
    readonly setState: (snapshot: MenuStateSnapshot) => void;
  };
  readonly fatal: {
    readonly onError: FatalSubscriber;
    readonly report: (payload: FatalPayload) => void;
  };
  readonly log: {
    readonly forward: (request: LogForwardRequest) => void;
  };
};
