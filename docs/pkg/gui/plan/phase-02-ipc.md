# Phase 2: Main & IPC Foundation

## 目的

Main プロセスが core (`@akabeko/music-metadata-editor`) を呼び出し、Renderer から **型安全な IPC** で `loadTrack` / `saveTrack` / `readMetadata` 等を実行できるようにする。Phase 3 以降の UI 実装が「IPC を呼ぶだけで動く」状態を作るのが目的で、このフェーズの完了時点では実 UI からの呼び出しは Devtools での手動確認 + 自動テストで担保すれば良い。

## スコープ

### IPC 設計の原則

1. **Renderer は core を import しない**。Renderer 側に Node 専用 API (`fs` 等) が混ざるのを防ぎ、Electron の context isolation 前提を崩さないため。
2. **チャンネル名は `mme:<resource>:<verb>` の 3 段**で揃える。例: `mme:track:load` / `mme:track:save` / `mme:settings:get` / `mme:dialog:openFiles`。
3. **invoke / handle のみを使う**。Renderer から `ipcRenderer.invoke` で呼び、Main は `ipcMain.handle` で応答する。`ipcRenderer.send` (一方向) は **Main → Renderer の進捗通知だけ** に限定する。
4. **request / response 型を `src/shared/ipc-contract.ts` に集約**する。Main / Preload / Renderer の 3 層で同じ型を import し、ハンドラ実装と Bridge 公開と Renderer 呼び出しを 1 箇所のソース オブ トゥルースで縛る。
5. **Bridge は `window.mme.<resource>.<verb>(args)`** の形に整える。`ipcRenderer.invoke("mme:track:load", args)` の生呼び出しは Renderer で書かない。
6. **エラーは IPC 境界で `MmeError` 互換オブジェクトに正規化**する。`Error` は構造化クローンで失われる情報が多いので、Plain Object に詰め替えて返す。

### IPC コントラクト (Phase 2 で定義する範囲)

最初は読み込み系を中心に揃え、書き込みは Phase 6 で `mme:track:save` を本格実装する想定。Phase 2 でも空ハンドラだけは作っておく (UI ができる前にハンドラ単体テストを書けるように)。

| Channel                   | 用途                                                            | Phase |
| ------------------------- | --------------------------------------------------------------- | ----- |
| `mme:app:getVersions`     | core / cli / electron / chrome / node のバージョン取得          | 2     |
| `mme:dialog:openFiles`    | ファイル選択ダイアログ。複数音楽ファイルのフルパス配列を返す    | 2     |
| `mme:track:load`          | フルパス → `Track` (core の `loadTrack` を Main で実行)         | 2     |
| `mme:track:loadMany`      | フルパス配列 → 並列 `Track[]`、失敗ファイルは `error` 付きで返す | 2     |
| `mme:track:save`          | `{ source: filePath, tag, pictures, chapters, lyrics }` を保存  | 2 (空実装 → 6 で本実装) |
| `mme:formatSupport:list`  | 各 `AudioFormat` ごとの「書き込み可能フィールド」マトリックス     | 2     |
| `mme:settings:get`        | ユーザー設定 JSON 全体の取得                                    | 2 (空実装 → 6 で本実装) |
| `mme:settings:set`        | パーシャル更新 (deep merge)                                     | 2 (空実装 → 6 で本実装) |
| `mme:progress:save` (1way)| Main → Renderer の保存進捗通知                                  | 6 で本実装 (Phase 2 では契約のみ) |

### `src/shared/ipc-contract.ts`

`channel → { request, response }` のマップを 1 ファイルにまとめる。Renderer / Preload / Main が同じ型を import する。

```ts
import type {
  AudioFormat,
  Track,
  TagData,
  PictureInfo,
  ChapterInfo,
  LyricsInfo,
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

export type IpcResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: IpcError };

export type LoadTrackResponse = IpcResult<{
  readonly filePath: string;
  readonly track: Track;
}>;

export type LoadManyResponse = IpcResult<
  ReadonlyArray<{
    readonly filePath: string;
    readonly result: IpcResult<Track>;
  }>
>;

export type SaveTrackRequest = {
  readonly filePath: string;
  readonly tag: Partial<TagData>;
  readonly pictures?: readonly PictureInfo[];
  readonly chapters?: readonly ChapterInfo[];
  readonly lyrics?: LyricsInfo;
};

export type FormatSupportEntry = {
  readonly format: AudioFormat;
  /** `tag` フィールド毎に書き込み可否を持つ。`true` のキーだけ列挙する。 */
  readonly writableTagFields: ReadonlySet<keyof TagData>;
  readonly supportsPictures: boolean;
  readonly supportsChapters: boolean;
  readonly supportsLyrics: boolean;
};

export type IpcContract = {
  "mme:app:getVersions": {
    request: void;
    response: { core: string; gui: string; electron: string; chrome: string; node: string };
  };
  "mme:dialog:openFiles": {
    request: { multiple?: boolean };
    response: IpcResult<readonly string[]>;
  };
  "mme:track:load": {
    request: { filePath: string };
    response: LoadTrackResponse;
  };
  "mme:track:loadMany": {
    request: { filePaths: readonly string[] };
    response: LoadManyResponse;
  };
  "mme:track:save": {
    request: SaveTrackRequest;
    response: IpcResult<{ filePath: string; warnings: readonly Warning[] }>;
  };
  "mme:formatSupport:list": {
    request: void;
    response: IpcResult<readonly FormatSupportEntry[]>;
  };
};
```

### Main プロセス側ハンドラ

```
src/main/
  main.ts                       # app whenReady → registerIpcHandlers
  ipc/
    register.ts                 # 全 channel の ipcMain.handle を一括登録
    track/
      handleLoadTrack.ts        # mme:track:load
      handleLoadMany.ts         # mme:track:loadMany (Promise.allSettled)
      handleSaveTrack.ts        # mme:track:save (Phase 6 で本実装)
    dialog/
      handleOpenFiles.ts        # showOpenDialog → 拡張子フィルタ付き
    formatSupport/
      handleList.ts             # core の対応マトリックスを返す
      matrix.ts                 # 純関数: AudioFormat → FormatSupportEntry
    app/
      handleGetVersions.ts
    errors/
      toIpcError.ts             # Error / MmeError → IpcError
```

- 各 handler は **副作用込みの薄いラッパー**で、ロジックは純関数 (`*.test.ts` で単体テストできる粒度) に切り出す。
- `Promise.allSettled` で `loadMany` を並列化するが、**同時実行数は OS のファイル ディスクリプタ枯渇を避けて 8 を上限**にセマフォで制限する (素朴に semaphore を実装。外部依存は入れない)。

### Preload (`src/preload/preload.ts`)

`contextBridge.exposeInMainWorld("mme", bridge)` で **`window.mme.<group>.<verb>(args)`** をユーザー空間に出す。Bridge オブジェクトは Phase 2 で次の形に固定する:

```ts
const bridge: MmeBridge = {
  versions: { ... },
  app: {
    getVersions: () => invoke("mme:app:getVersions"),
  },
  dialog: {
    openFiles: (req) => invoke("mme:dialog:openFiles", req),
  },
  track: {
    load: (req) => invoke("mme:track:load", req),
    loadMany: (req) => invoke("mme:track:loadMany", req),
    save: (req) => invoke("mme:track:save", req),
  },
  formatSupport: {
    list: () => invoke("mme:formatSupport:list"),
  },
  // settings は Phase 2 で型のみ、ハンドラは Phase 6 で本実装
};
```

`invoke` の中身は `(channel, request) => ipcRenderer.invoke(channel, request)` を `ipc-contract.ts` の型に合うようにキャストするヘルパー。

### Renderer 側のラッパー

- `src/renderer/ipc/index.ts` で `window.mme` を参照し、テスト時に差し替えやすいよう **モジュール スコープのシングルトン**として `getBridge(): MmeBridge` をエクスポートする。
- `window.mme` が未定義 (= context isolation 失敗 / preload 未ロード) の場合は **明示的な error を投げる**。silent fallback (mock) は導入しない。
- Renderer のロジック層 (Phase 3 以降) は `import { getBridge } from "@/ipc"` のみを通って IPC を呼ぶ。`window.mme` を直接触るコードは書かない。

### `MmeError` の伝搬

- core の `MmeError` (`{ name, code, message, cause }`) は Main 側で `toIpcError(error)` を通して `{ name, code, message }` に縮める。`cause` は捨てる (Renderer に渡しても扱えないため)。
- 一般 `Error` は `{ name, message }` のみで `code: undefined`。Renderer 側はその場合「予期しないエラー」と表示する。
- Renderer の表示ロジックは Phase 3 で固める (Phase 2 は IPC 経由で `IpcError` が届くことだけ担保)。

### Logger

- Main: 当面は `console.log` / `console.error` で良い。`MmeError` は **Main 側でも log し**、Renderer 側でも log することで、ユーザーが Renderer Devtools を開かなくても terminal で trace できるようにする。
- ファイル ログは Phase 7 で `electron-log` 検討。

### File ダイアログのフィルタ

- `mme:dialog:openFiles` で表示する filter は core の `AudioFormat` 列挙に対応させる:
  - `Audio (*.mp3 *.flac *.m4a *.mp4 *.ogg *.opus *.wav *.aiff *.wma *.ape)`
  - `All Files`
- `multiple: true` を既定 (スプレッドシートに複数ファイル投入する想定)。
- Phase 3 で D&D も追加するが、Phase 2 では dialog 経由のみ。

## 設計方針

- IPC 境界は **「ロジック層 (純関数)」と「Electron 接着層 (副作用)」** の 2 層で分ける。前者は単体テストで網羅し、後者は薄く保つ。
- core への直接依存は **Main プロセスのみ**。`packages/gui/src/main/**/*.ts` 以外から `@akabeko/music-metadata-editor` の値を import しない (型は `src/shared/` 経由なら OK)。`tsconfig.web.json` の `paths` でも core を resolve させないよう lint で監視できるならする。
- IPC contract は `Map<channel, { request; response }>` の形なので、ハンドラ登録漏れが TypeScript で検出できる。`registerIpcHandlers` は `IpcContract` の `keyof` を `Object.keys` でループせず、明示列挙にすることで「足し忘れ」を型エラーにする。

## 主要な内部 API (案)

```ts
// Main 側
export const registerIpcHandlers: (ipcMain: IpcMain) => void;
export const handleLoadTrack: (req: { filePath: string }) => Promise<LoadTrackResponse>;
export const handleLoadMany: (req: { filePaths: readonly string[] }) => Promise<LoadManyResponse>;
export const buildFormatSupportMatrix: () => readonly FormatSupportEntry[]; // 純関数

// 共通
export const toIpcError: (error: unknown) => IpcError;
```

## 依存

- Phase 1 (パッケージ骨格、3 プロセス起動)。
- core v1.x の `loadTrack` / `saveTrack` / `readMetadata` / `writeMetadata` / `Track` / `TagData` 型がリリース済み。

## テスト方針

- `toIpcError` は (a) `MmeError` → `{ name, code, message }` (b) 一般 `Error` → `{ name, message }` (c) 不明値 (`null`, `123`) → `{ name: "Error", message: String(value) }` を網羅。
- `buildFormatSupportMatrix` は core の対応表と整合することをスナップショットで固定。core 側の対応マトリックスが変わったら snapshot が破れるので、レビュー時に GUI 側の表示を更新できる。
- `handleLoadTrack` は `tests/fixtures/` に置いた MP3 / FLAC fixture を使った integration テスト 1 ケース。fixtures は core の物を直接参照せず、scripts で生成する (Phase 3 で本格化)。
- `handleLoadMany` は (a) 全部成功 (b) 一部失敗 (壊れたファイル) (c) すべて失敗 を確認。
- IPC contract の型整合: Renderer 側の `getBridge` が返す Bridge の型と、Main 側の `registerIpcHandlers` が登録するチャンネルの型が一致することを **`expectTypeOf`** (vitest) で型レベル assertion。
- IPC E2E テストは Phase 2 では入れない (`spectron` 系の代替は重い。Renderer の動作は Phase 4 以降で React Testing Library で IPC を mock してテスト)。

## 完了条件 (DoD)

- `src/shared/ipc-contract.ts` に Phase 2 ぶんのチャンネル契約が定義され、Main / Preload / Renderer から共有されている。
- `mme:app:getVersions` / `mme:dialog:openFiles` / `mme:track:load` / `mme:track:loadMany` / `mme:formatSupport:list` が動作する。
- `mme:track:save` / `mme:settings:*` の channel と Bridge は宣言済みだが、Main 側ハンドラはスタブで `{ ok: false, error: { name: "NotImplemented", message: "..." } }` を返して良い。
- 各 channel の純関数部分に `*.test.ts` がある。
- Renderer Devtools のコンソールから `await window.mme.app.getVersions()` を叩いて応答が返る (手動確認 OK)。
- `pnpm -r typecheck` / `pnpm -r test` / `pnpm check` が緑。

## 参考資料

- Electron `ipcMain.handle` / `ipcRenderer.invoke`: <https://www.electronjs.org/docs/latest/tutorial/ipc#pattern-2-renderer-to-main-two-way>
- Context Isolation: <https://www.electronjs.org/docs/latest/tutorial/context-isolation>
- core 公開 API: `packages/core/src/api/{loadTrack,saveTrack,readMetadata,writeMetadata}.ts`
- core の `Track` / `TagData` / `MmeError`: `packages/core/src/types.ts`、`packages/core/src/errors/`
