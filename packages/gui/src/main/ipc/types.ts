import type {
  AudioFormat,
  ChapterInfo,
  LyricsInfo,
  PictureInfo,
  TagData,
  Track,
  Warning,
} from "@akabeko/music-metadata-editor";

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
 * Phase 2 keeps the type intentionally open (`Record<string, unknown>`) so the
 * channels can be declared and stubbed without committing to a key set; Phase 6
 * narrows it to the real schema.
 */
export type SettingsSnapshot = Readonly<Record<string, unknown>>;

/** Request payload for `mme:settings:set`. */
export type SetSettingsRequest = {
  readonly patch: SettingsSnapshot;
};

/**
 * Payload of the Main → Renderer save-progress notification.
 *
 * Phase 2 only fixes the contract; Main does not emit progress yet — Phase 6
 * wires up the real save pipeline.
 */
export type ProgressSavePayload = {
  readonly filePath: string;
  /** Completion ratio in `[0, 1]`. */
  readonly progress: number;
  readonly stage: "start" | "writing" | "done" | "error";
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
  };
  readonly track: {
    readonly load: (request: { filePath: string }) => Promise<IpcResult<LoadTrackOk>>;
    readonly loadMany: (request: {
      filePaths: readonly string[];
    }) => Promise<IpcResult<readonly LoadManyEntry[]>>;
    readonly save: (request: SaveTrackRequest) => Promise<IpcResult<SaveTrackOk>>;
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
};
