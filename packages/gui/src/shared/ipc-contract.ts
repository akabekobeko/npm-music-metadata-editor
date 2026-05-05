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
 * Request payload of `mme:track:save`.
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
 * Versions of the runtime stack reported by `mme:app:getVersions`.
 *
 * `core` is the version of `@akabeko/music-metadata-editor`; `gui` is the
 * version of the Electron app itself. The remaining fields mirror
 * `process.versions` for support / bug-report purposes.
 */
export type AppVersions = {
  readonly core: string;
  readonly gui: string;
  readonly electron: string;
  readonly chrome: string;
  readonly node: string;
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

/**
 * Map of `channel name → { request, response }` consumed by Main, Preload, and
 * Renderer to keep all three layers in sync.
 *
 * Adding a new channel here is the single source of truth: the
 * `registerIpcHandlers` switch and the Preload bridge both fail to type-check
 * until they cover the new key.
 */
export type IpcContract = {
  "mme:app:getVersions": {
    request: undefined;
    response: AppVersions;
  };
  "mme:dialog:openFiles": {
    request: { readonly multiple?: boolean };
    response: IpcResult<readonly string[]>;
  };
  "mme:track:load": {
    request: { readonly filePath: string };
    response: IpcResult<LoadTrackOk>;
  };
  "mme:track:loadMany": {
    request: { readonly filePaths: readonly string[] };
    response: IpcResult<readonly LoadManyEntry[]>;
  };
  "mme:track:save": {
    request: SaveTrackRequest;
    response: IpcResult<SaveTrackOk>;
  };
  "mme:formatSupport:list": {
    request: undefined;
    response: IpcResult<readonly FormatSupportEntry[]>;
  };
  "mme:settings:get": {
    request: undefined;
    response: IpcResult<SettingsSnapshot>;
  };
  "mme:settings:set": {
    request: { readonly patch: SettingsSnapshot };
    response: IpcResult<SettingsSnapshot>;
  };
};

/** All IPC channel names declared in {@link IpcContract}. */
export type IpcChannel = keyof IpcContract;

/** Request payload type for the given channel. */
export type IpcRequestOf<C extends IpcChannel> = IpcContract[C]["request"];

/** Response payload type for the given channel. */
export type IpcResponseOf<C extends IpcChannel> = IpcContract[C]["response"];

/**
 * Channel name for the Main → Renderer save-progress notification.
 *
 * Declared separately from {@link IpcContract} because the Phase 2 contract is
 * `invoke`/`handle` only; one-way `send` channels are kept distinct so a future
 * `dispatch` helper does not blur the two patterns.
 */
export const PROGRESS_SAVE_CHANNEL = "mme:progress:save" as const;

/**
 * Payload of {@link PROGRESS_SAVE_CHANNEL}.
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
