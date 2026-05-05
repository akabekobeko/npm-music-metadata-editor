# Phase 2: Main & IPC Foundation

## 目的

Main プロセスが core (`@akabeko/music-metadata-editor`) を呼び出し、Renderer から **型安全な IPC** で `loadTrack` / `saveTrack` / `readMetadata` 等を実行できるようにする。Phase 3 以降の UI 実装が「IPC を呼ぶだけで動く」状態を作るのが目的で、このフェーズの完了時点では実 UI からの呼び出しは Devtools での手動確認 + 自動テストで担保すれば良い。

## スコープ

### IPC 設計の原則

1. **Renderer / Preload は core も electron も value で import しない**。Renderer 側に Node 専用 API (`fs` 等) が混ざるのを防ぎ、Electron の context isolation 前提を崩さないため。`@akabeko/music-metadata-editor` を value import するのは **Main プロセスのみ** とし、Preload と Renderer は `src/main/ipc/types.ts` から `import type` で型のみ取得する。
2. **チャンネル名は `mme:<resource>:<verb>` の 3 段**で揃える。例: `mme:track:load` / `mme:track:save` / `mme:settings:get` / `mme:dialog:openFiles`。文字列リテラルは `src/main/ipc/ipcKeys.ts` に定数として集約し、Main と Preload で同じ識別子を参照する。
3. **invoke / handle のみを使う**。Renderer から `ipcRenderer.invoke` で呼び、Main は `ipcMain.handle` で応答する。`ipcRenderer.send` (一方向) は **Main → Renderer の進捗通知だけ** に限定する (`mme:progress:save`)。
4. **Main + Preload に IPC を寄せる**。Renderer 側に「IPC 呼び出しの薄いラッパー」レイヤー (例: `getBridge`) は作らない。Renderer は `window.mme.<group>.<verb>(args)` を直接呼ぶ。Preload は `IpcKeys` を `../main/ipc/ipcKeys` から import し、`contextBridge.exposeInMainWorld("mme", api)` で公開する。
5. **MmeBridge の型は `src/main/ipc/types.ts` を単一のソース オブ トゥルース** とする。Preload は `import type` でこの型を取得し、Renderer 用には `src/renderer/vite-env.d.ts` で `declare global { interface Window { readonly mme: MmeBridge } }` する。`src/shared/` のような共有レイヤーは作らない。
6. **エラーは IPC 境界で `MmeError` 互換オブジェクトに正規化**する。`Error` は構造化クローンで失われる情報が多いので、`{ name, code?, message }` の Plain Object (`IpcError`) に詰め替えて返す。Renderer は `IpcResult<T>` (`{ ok: true, value } | { ok: false, error }`) を受け取って分岐する。

### IPC コントラクト (Phase 2 で定義する範囲)

最初は読み込み系を中心に揃え、書き込みは Phase 6 で `mme:track:save` を本格実装する想定。Phase 2 でも空ハンドラだけは作っておく (UI ができる前にハンドラ単体テストを書けるように)。

| Channel                   | 用途                                                            | Phase |
| ------------------------- | --------------------------------------------------------------- | ----- |
| `mme:app:getVersions`     | core / gui / electron / chrome / node のバージョン取得          | 2     |
| `mme:dialog:openFiles`    | ファイル選択ダイアログ。複数音楽ファイルのフルパス配列を返す    | 2     |
| `mme:track:load`          | フルパス → `Track` (core の `loadTrack` を Main で実行)         | 2     |
| `mme:track:loadMany`      | フルパス配列 → 並列 `Track[]`、失敗ファイルは `error` 付きで返す | 2     |
| `mme:track:save`          | `{ filePath, tag, pictures, chapters, lyrics }` を保存         | 2 (空実装 → 6 で本実装) |
| `mme:formatSupport:list`  | 各 `AudioFormat` ごとの「書き込み可能フィールド」マトリックス    | 2     |
| `mme:settings:get`        | ユーザー設定 JSON 全体の取得                                    | 2 (空実装 → 6 で本実装) |
| `mme:settings:set`        | パーシャル更新 (deep merge)                                     | 2 (空実装 → 6 で本実装) |
| `mme:progress:save` (1way)| Main → Renderer の保存進捗通知                                  | 6 で本実装 (Phase 2 では契約のみ) |

### `src/main/ipc/ipcKeys.ts`

channel 名定数を **`as const` の Plain Object** で公開する。リネーム時に Main / Preload を一括追従できる。

```ts
export const IpcKeys = {
  GetVersions: "mme:app:getVersions",
  ShowOpenFiles: "mme:dialog:openFiles",
  LoadTrack: "mme:track:load",
  LoadMany: "mme:track:loadMany",
  SaveTrack: "mme:track:save",
  ListFormatSupport: "mme:formatSupport:list",
  GetSettings: "mme:settings:get",
  SetSettings: "mme:settings:set",
  ProgressSave: "mme:progress:save",
} as const;
```

### `src/main/ipc/types.ts`

`MmeBridge` (= `window.mme` 型) と各 channel の request / response 型、共通の `IpcError` / `IpcResult<T>` を集約する。core の型 (`Track`, `TagData`, `PictureInfo` 等) は **このファイルが唯一の経由地** で、`export type { Track, TagData, ... }` の type-only re-export を通じて Renderer / Preload に伝搬させる。

```ts
import type {
  AudioFormat,
  ChapterInfo,
  LyricsInfo,
  PictureInfo,
  TagData,
  Track,
  Warning,
} from "@akabeko/music-metadata-editor";

export type { AudioFormat, ChapterInfo, LyricsInfo, PictureInfo, TagData, Track, Warning };

export type IpcError = {
  readonly name: string;
  readonly code?: string;
  readonly message: string;
};

export type IpcResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: IpcError };

export type LoadTrackOk = {
  readonly filePath: string;
  readonly track: Track;
};

export type LoadManyEntry = {
  readonly filePath: string;
  readonly result: IpcResult<Track>;
};

export type SaveTrackRequest = {
  readonly filePath: string;
  readonly tag: Partial<TagData>;
  readonly pictures?: readonly PictureInfo[];
  readonly chapters?: readonly ChapterInfo[];
  readonly lyrics?: LyricsInfo;
};

export type SaveTrackOk = {
  readonly filePath: string;
  readonly warnings: readonly Warning[];
};

export type FormatSupportEntry = {
  readonly format: AudioFormat;
  readonly writableTagFields: ReadonlyArray<keyof TagData>;
  readonly supportsPictures: boolean;
  readonly supportsChapters: boolean;
  readonly supportsLyrics: boolean;
};

export type AppVersions = {
  readonly core: string;
  readonly gui: string;
  readonly electron: string;
  readonly chrome: string;
  readonly node: string;
};

export type SettingsSnapshot = Readonly<Record<string, unknown>>;
export type SetSettingsRequest = { readonly patch: SettingsSnapshot };

export type ProgressSavePayload = {
  readonly filePath: string;
  readonly progress: number;
  readonly stage: "start" | "writing" | "done" | "error";
};

export type MmeBridge = {
  readonly versions: { readonly node: string; readonly chrome: string; readonly electron: string };
  readonly app: { readonly getVersions: () => Promise<AppVersions> };
  readonly dialog: {
    readonly openFiles: (request?: { multiple?: boolean }) => Promise<IpcResult<readonly string[]>>;
  };
  readonly track: {
    readonly load: (request: { filePath: string }) => Promise<IpcResult<LoadTrackOk>>;
    readonly loadMany: (request: { filePaths: readonly string[] }) => Promise<IpcResult<readonly LoadManyEntry[]>>;
    readonly save: (request: SaveTrackRequest) => Promise<IpcResult<SaveTrackOk>>;
  };
  readonly formatSupport: { readonly list: () => Promise<IpcResult<readonly FormatSupportEntry[]>> };
  readonly settings: {
    readonly get: () => Promise<IpcResult<SettingsSnapshot>>;
    readonly set: (request: SetSettingsRequest) => Promise<IpcResult<SettingsSnapshot>>;
  };
  readonly progress: {
    readonly onSave: (listener: (payload: ProgressSavePayload) => void) => () => void;
  };
};
```

### Main プロセス側ハンドラ

```
src/main/
  main.ts                       # app whenReady → initializeIpcEvents、will-quit → releaseIpcEvents
  ipc/
    ipcKeys.ts                  # channel 定数
    types.ts                    # MmeBridge / IpcResult / payload 型 + core 型 re-export
    ipcHandler.ts               # initializeIpcEvents / releaseIpcEvents
    onGetVersions.ts            # mme:app:getVersions
    onShowOpenFiles.ts          # mme:dialog:openFiles (BrowserWindow.fromWebContents で親解決)
    onLoadTrack.ts              # mme:track:load
    onLoadMany.ts               # mme:track:loadMany (semaphore で 8 並列)
    onSaveTrack.ts              # mme:track:save (Phase 6 で本実装、Phase 2 は NotImplemented)
    onListFormatSupport.ts      # mme:formatSupport:list
    onGetSettings.ts            # mme:settings:get (Phase 6 で本実装)
    onSetSettings.ts            # mme:settings:set (Phase 6 で本実装)
    formatSupport/
      buildFormatSupportMatrix.ts  # 純関数: AudioFormat → FormatSupportEntry の集合
    utils/
      toIpcError.ts             # Error / MmeError → IpcError
      semaphore.ts              # FIFO セマフォ (外部依存なし)
```

- 各 `onX.ts` は **`(ev: Electron.IpcMainInvokeEvent, request) => Promise<response>`** のシグネチャに揃える (参考: `audio-player/src/main/ipc/onShowOpenDialog.ts`)。副作用込みの薄いラッパーで、テストしたいロジックは純関数 (`buildFormatSupportMatrix` / `toIpcError` / `createSemaphore` 等) に切り出す。
- `Promise.allSettled` 相当の処理は `onLoadMany` で行うが、**同時実行数は OS のファイル ディスクリプタ枯渇を避けて 8 を上限**にセマフォで制限する (素朴に semaphore を実装。外部依存は入れない)。
- `ipcHandler.ts` に `initializeIpcEvents()` / `releaseIpcEvents()` を持たせ、`main.ts` の `app.whenReady` / `will-quit` から呼ぶ。`isInitialized` フラグで二重登録をガードする。

### Preload (`src/preload/preload.ts`)

`contextBridge.exposeInMainWorld("mme", bridge)` で `window.mme.<group>.<verb>(args)` を Renderer に出す。`IpcKeys` (value) と `MmeBridge` / `ProgressSavePayload` (type-only) を `../main/ipc/...` から import し、ライブラリーへの直接依存は持たない。

```ts
import { contextBridge, ipcRenderer } from "electron";
import { IpcKeys } from "../main/ipc/ipcKeys.js";
import type { MmeBridge, ProgressSavePayload } from "../main/ipc/types.js";

const buildBridge = (): MmeBridge => ({
  versions: { node: process.versions.node, chrome: process.versions.chrome, electron: process.versions.electron },
  app: { getVersions: () => ipcRenderer.invoke(IpcKeys.GetVersions) },
  dialog: { openFiles: (req) => ipcRenderer.invoke(IpcKeys.ShowOpenFiles, req) },
  track: {
    load: (req) => ipcRenderer.invoke(IpcKeys.LoadTrack, req),
    loadMany: (req) => ipcRenderer.invoke(IpcKeys.LoadMany, req),
    save: (req) => ipcRenderer.invoke(IpcKeys.SaveTrack, req),
  },
  formatSupport: { list: () => ipcRenderer.invoke(IpcKeys.ListFormatSupport) },
  settings: {
    get: () => ipcRenderer.invoke(IpcKeys.GetSettings),
    set: (req) => ipcRenderer.invoke(IpcKeys.SetSettings, req),
  },
  progress: {
    onSave: (listener) => {
      const wrapped = (_event: unknown, payload: ProgressSavePayload): void => listener(payload);
      ipcRenderer.on(IpcKeys.ProgressSave, wrapped);
      return () => ipcRenderer.off(IpcKeys.ProgressSave, wrapped);
    },
  },
});

contextBridge.exposeInMainWorld("mme", buildBridge());
```

### Renderer (`src/renderer/vite-env.d.ts` + 各画面)

- `vite-env.d.ts` で `Window.mme: MmeBridge` を `declare global` で注入する。`MmeBridge` は `import type "../main/ipc/types"` で取得する (型解決のみ。runtime には main コードが入らない)。

  ```ts
  /// <reference types="vite/client" />

  import type { MmeBridge } from "../main/ipc/types";

  declare global {
    interface Window {
      readonly mme: MmeBridge;
    }
  }
  ```

- Renderer のロジック層 (Phase 3 以降) は **`window.mme.<group>.<verb>(args)` を直接呼ぶ**。`getBridge()` のような中間ラッパや「IPC モジュール スコープのシングルトン」は導入しない。テスト時のモックは `vi.stubGlobal("window", { mme: ... })` か、`window.mme.x.y` を直接 spy する。

### `MmeError` の伝搬

- core の `MmeError` (`{ name, code, message, cause }`) は Main 側で `toIpcError(error)` を通して `{ name, code, message }` に縮める。`cause` は捨てる (Renderer に渡しても扱えないため)。
- 一般 `Error` は `{ name, message }` のみで `code: undefined`。Renderer 側はその場合「予期しないエラー」と表示する。
- Renderer の表示ロジックは Phase 3 で固める (Phase 2 は IPC 経由で `IpcError` が届くことだけ担保)。

### Logger

- Main: 当面は `console.log` / `console.error` で良い。`MmeError` は **Main 側でも log し**、Renderer 側でも log することで、ユーザーが Renderer Devtools を開かなくても terminal で trace できるようにする。
- ファイル ログは Phase 7 で `electron-log` 検討。

### File ダイアログのフィルタ

- `mme:dialog:openFiles` で表示する filter は core の `AudioFormat` 列挙に対応させる:
  - `Audio (*.mp3 *.flac *.m4a *.mp4 *.ogg *.opus *.wav *.aiff *.aif *.wma *.ape)`
  - `All Files`
- `multiple: true` を既定 (スプレッドシートに複数ファイル投入する想定)。
- 親ウィンドウは `BrowserWindow.fromWebContents(ev.sender)` で解決する (modal を正しい window に attach するため)。
- Phase 3 で D&D も追加するが、Phase 2 では dialog 経由のみ。

## 設計方針

- IPC 境界は **「ロジック層 (純関数)」と「Electron 接着層 (副作用)」** の 2 層で分ける。前者は単体テストで網羅し、後者は薄く保つ。
- core への value 依存は **Main プロセスのみ**。`packages/gui/src/preload/**/*.ts` と `packages/gui/src/renderer/**/*.{ts,tsx}` から `@akabeko/music-metadata-editor` を import するのは禁止 (型のみは `src/main/ipc/types.ts` 経由で参照する)。`tsconfig.web.json` の `include` を `src/renderer/**/*` に絞ることで、Renderer の compile 単位から `main/` を外しつつ、`import type` の解決は通る。
- `ipcHandler.ts` の `initializeIpcEvents` は **チャンネル名と `onX` のペアを明示列挙**することで、`IpcKeys` を増やしたときに wire 漏れがレビューで検出できるようにする。

## 主要な内部 API (案)

```ts
// Main 側
export const initializeIpcEvents: () => void;
export const releaseIpcEvents: () => void;
export const onLoadTrack: (
  ev: Electron.IpcMainInvokeEvent,
  req: { filePath: string },
) => Promise<IpcResult<LoadTrackOk>>;
export const onLoadMany: (
  ev: Electron.IpcMainInvokeEvent,
  req: { filePaths: readonly string[] },
) => Promise<IpcResult<readonly LoadManyEntry[]>>;
export const buildFormatSupportMatrix: () => readonly FormatSupportEntry[]; // 純関数

// 共通 utility
export const toIpcError: (error: unknown) => IpcError;
export const createSemaphore: (limit: number) => Semaphore;
```

## 依存

- Phase 1 (パッケージ骨格、3 プロセス起動)。
- core v1.x の `loadTrack` / `saveTrack` / `readMetadata` / `writeMetadata` / `Track` / `TagData` 型がリリース済み。

## テスト方針

- テスト ファイルは **対象ソースと 1 対 1 対応**。1 関数 1 ファイルなので **`describe` ラッパは付けず `it` をフラットに並べる** (`docs/rules/testing.md`)。`beforeEach` / `afterEach` も describe なしでファイル全体に効く。
- `toIpcError` は (a) `MmeError` → `{ name, code, message }` (b) 一般 `Error` → `{ name, message }` (c) 不明値 (`null`, `123`, plain object) → `{ name: "Error", message: String(value) }` (d) `name` が空文字の Error → `"Error"` にフォールバック を網羅。
- `createSemaphore` は (a) limit 不正 (0 / 負 / 小数) で `RangeError` (b) limit 超過しないこと (c) 戻り値が伝搬すること (d) throw 時もスロットが解放されること を確認。
- `buildFormatSupportMatrix` は core の対応表と整合することをスナップショット (`toMatchInlineSnapshot`) で固定する。core 側の対応マトリックスが変わったら snapshot が破れるので、レビュー時に GUI 側の表示を更新できる。
- `onLoadTrack` は `os.tmpdir()` 配下に最小 MP3 buffer (silent frame) を書いて呼び出す integration テストで (a) 成功 (b) 存在しないファイル → ENOENT (c) 不正フォーマット → `MmeError` (`unsupported-format`) を確認。Phase 3 以降で本格的なフィクスチャが整ったら差し替える (Phase 2 ではテスト内で buffer を組み立てる軽量実装で良い)。
- `onLoadMany` は (a) 全部成功 (b) 一部失敗 (壊れたファイル) (c) すべて失敗 (d) 空 list を確認。
- `onSaveTrack` / `onGetSettings` / `onSetSettings` は Phase 2 では `NotImplemented` の `IpcError` を返すスタブなので、その応答だけテストする。
- IPC E2E テストは Phase 2 では入れない (`spectron` 系の代替は重い。Renderer の動作は Phase 4 以降で React Testing Library で IPC を mock してテスト)。

## 完了条件 (DoD)

- `src/main/ipc/types.ts` に Phase 2 ぶんの型 (`MmeBridge` / `IpcResult` / 各 payload) が定義され、Main / Preload / Renderer から `import type` で参照されている。
- `src/main/ipc/ipcKeys.ts` に channel 定数が定義され、Main の `ipcHandler.ts` と Preload の `preload.ts` の双方が同じ識別子を使っている。
- `mme:app:getVersions` / `mme:dialog:openFiles` / `mme:track:load` / `mme:track:loadMany` / `mme:formatSupport:list` が動作する。
- `mme:track:save` / `mme:settings:*` の channel と Bridge は宣言済みだが、Main 側ハンドラはスタブで `{ ok: false, error: { name: "NotImplemented", message: "..." } }` を返して良い。
- `src/renderer/vite-env.d.ts` で `Window.mme` が型付けされ、Renderer から `window.mme.x.y(args)` を直接呼べる。`src/shared/` や `src/renderer/ipc/` のような中間レイヤーは存在しない。
- 各 channel の純関数部分 / 各 `onX` ハンドラに `*.test.ts` がある (フラット記述)。
- Renderer Devtools のコンソールから `await window.mme.app.getVersions()` を叩いて応答が返る (手動確認 OK)。
- `pnpm -r typecheck` / `pnpm -r test` / `pnpm check` が緑。
- Renderer / Preload の bundle に `@akabeko/music-metadata-editor` の文字列が含まれないこと (= type-only import が正しく erase されていること) を `grep` で確認 (手動)。

## 参考資料

- Electron `ipcMain.handle` / `ipcRenderer.invoke`: <https://www.electronjs.org/docs/latest/tutorial/ipc#pattern-2-renderer-to-main-two-way>
- Context Isolation: <https://www.electronjs.org/docs/latest/tutorial/context-isolation>
- 参考実装 (Main + Preload 寄せ IPC、`vite-env.d.ts` での型注入): `akabekobeko/audio-player` (必要に応じてローカル clone のパスをユーザーに確認)
- core 公開 API: `packages/core/src/api/{loadTrack,saveTrack,readMetadata,writeMetadata}.ts`
- core の `Track` / `TagData` / `MmeError`: `packages/core/src/types.ts`、`packages/core/src/errors/`
