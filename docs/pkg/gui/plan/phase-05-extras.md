# Phase 5: Pictures & Lyrics Modal

## 目的

スプレッドシート上では「件数」「present/none」のサマリーしか出さない **Pictures (埋め込み画像)** と **Lyrics (歌詞)** を、それぞれ専用モーダル ダイアログで編集できるようにする。Phase 6 で `saveTrack` を呼ぶ前に、Renderer メモリ上の `Track.pictures` / `Track.lyrics` を構造化したまま編集できる状態を整える。

## スコープ

### Pictures モーダル

#### 起動

- スプレッドシートの `pictures` セルを **ダブル クリック** で開く。
- セルが「ファイル フォーマットが pictures を未サポート」であれば、モーダルは開かず Toast で案内。
- 複数行を選択した状態で開いた場合は **先頭行のみ** を対象にする (バッチ編集は v1 では非対応)。

#### レイアウト

```
+-------------------------------------------------+
|  Pictures — song.mp3                            |  (header: title + close)
|-------------------------------------------------|
|  [list]      |  [preview]                       |
|  ┌────────┐  |   ┌─────────────────────┐         |
|  | Cover  |  |   |                     |         |
|  | Front  |  |   |   <image preview>   |         |
|  | 12 KiB |  |   |                     |         |
|  ├────────┤  |   └─────────────────────┘         |
|  | Back   |  |   Kind:        [Cover (front) v]  |
|  ├────────┤  |   MIME type:   image/jpeg         |
|  | Other  |  |   Description: [_______________]  |
|  └────────┘  |   Size:        12.3 KiB           |
|                                                  |
|  [+ Add]    [Replace…]  [Export…]   [Remove]    |
|-------------------------------------------------|
|              [Cancel]  [Apply (1 change)]        |
+-------------------------------------------------+
```

- 左ペイン: 既存ピクチャのリスト (サムネイル + Kind ラベル + サイズ)。並び順は `kind` 昇順。
- 右ペイン: 選択中ピクチャのプレビュー + 属性編集フォーム。
- フッター: `Cancel` / `Apply`。`Apply` を押すまで `Track.pictures` には反映しない (== モーダル ローカルの draft state を持つ)。

#### 操作

- **Add**: ファイル選択ダイアログ (画像のみフィルタ: `*.jpg, *.jpeg, *.png, *.webp, *.gif`) → 選んだファイルを Renderer 側で `File.arrayBuffer()` → `Uint8Array` 化し、新しい `PictureInfo` として draft に追加。`kind` 既定は `CoverFront`、`mimeType` はファイルから推定。
- **Replace…**: 選択中ピクチャの `data` だけ差し替え。属性は保持。
- **Export…**: `<save dialog>` → 選択中の `data` をそのまま書き出す。**Renderer 側では Node の fs を直接呼ばず**、`mme:dialog:saveFile` (Phase 5 で追加) を Main 経由で呼ぶ。
- **Remove**: 選択中ピクチャを draft から削除。
- **Kind / MIME type / Description の編集**: フォームで即座に draft に反映。MIME type は editable だが、Add 時に推定したものから手動で書き換えるのは稀ケース (例: `image/octet-stream` を直したい時) に限るので、**プルダウン (jpeg / png / webp / gif) + 自由入力** の組み合わせにする。

#### 画像プレビュー

- `Uint8Array` を `Blob` → `URL.createObjectURL` で `<img>` 表示。
- 5 MiB 以上の画像は読み込み時に **「サイズ警告」** を出す (タグ サイズが膨張するため)。
- 異常 (`<img>` の `onError`) は「画像として表示できません」のメッセージ。

#### 新規 IPC: `mme:dialog:saveFile`

- request: `{ defaultFileName?: string; filters?: { name: string; extensions: string[] }[] }`
- response: `IpcResult<{ filePath: string } | null>` (キャンセル時は `{ ok: true, value: null }`)
- Main 側は `dialog.showSaveDialog` を呼んで決定パスを返す。**書き込み自体は Renderer から `mme:file:writeBytes` (Phase 5 で追加) を呼ぶ**:
  - request: `{ filePath: string; bytes: Uint8Array }`
  - response: `IpcResult<void>`
  - Main 側は `fs.promises.writeFile(filePath, Buffer.from(bytes))`。
  - 既存ファイルへの上書きは **OK** (saveDialog で確認済みのため)。

### Lyrics モーダル

#### 起動

- スプレッドシートの `lyrics` セルをダブル クリックで開く。
- セルが「Lyrics 未サポート フォーマット」(対応マトリックスで判定) の場合はモーダルを開かず Toast で案内。

#### レイアウト

```
+-------------------------------------------------+
|  Lyrics — song.mp3                              |
|-------------------------------------------------|
|  [Tabs]                                         |
|   ▸ Plain text                                  |
|   ▸ Synchronized (LRC)                          |
|-------------------------------------------------|
|  Language: [eng v]   Description: [_________]   |
|-------------------------------------------------|
|  +-- Plain text tab --------------------------+ |
|  |  <textarea rows=20>                        | |
|  |                                             | |
|  +---------------------------------------------+ |
|                                                  |
|  +-- Synchronized tab -------------------------+ |
|  |  Time      | Text                            |
|  |  00:00.000 | Intro                           |
|  |  00:12.300 | Foo bar baz                     |
|  |  ...                                         |
|  |  [+ Line]  [Import LRC…]  [Export LRC…]      |
|  +---------------------------------------------+ |
|-------------------------------------------------|
|              [Cancel]  [Apply]                   |
+-------------------------------------------------+
```

#### Plain text タブ

- `unsynchronized: string` を `<Textarea>` で編集。
- 改行はそのまま保持 (Phase 4 のセル編集と違って改行を許す)。
- 先頭/末尾の trim は行わない。

#### Synchronized タブ

- `synchronized: readonly { timeMs: number; text: string }[]` を時系列順 (`timeMs` ASC) のテーブルで表示・編集。
- 行 (line) ごとに `time (mm:ss.SSS)` 入力 + `text` 入力 + 削除ボタン。
- `+ Line` で末尾追加、`Import LRC…` で `.lrc` ファイル読み込み、`Export LRC…` でファイル書き出し。
- LRC のパース / 書き出しは **純関数として `src/renderer/features/lyrics/lrc.ts` に切る**:
  - `parseLrc(text): readonly { timeMs: number; text: string }[]`
  - `formatLrc(lines): string`
  - メタデータ行 (`[ar:Foo]` 等) は読み込み時に拾うが、現状の UI では表示のみ (Plain text タブの `description` に流すか、Phase 5 の段階では破棄するかは PoC で決定)。

#### Apply 時の整形

- Plain text タブが空文字 (空白のみ含む) → `unsynchronized: undefined`。
- Synchronized タブで 1 行も無い → `synchronized: undefined`。
- 両方空 → `Track.lyrics = undefined`。
- どちらか片方でも値があれば `LyricsInfo` を組む。

### IPC 追加分

| Channel               | 用途                               |
| --------------------- | ---------------------------------- |
| `mme:dialog:saveFile` | 保存ダイアログ。決定パスを返す。   |
| `mme:file:writeBytes` | 任意パスにバイト列を書き出す。     |
| `mme:file:readBytes`  | 任意パスから読み込む (LRC 読込用)。|

すべて `IpcResult` で包む。`writeBytes` / `readBytes` は **音楽ファイル本体には使わない** (それらは `mme:track:save` / `mme:track:load` を経由する)。Picture / Lyrics の補助ファイルだけが対象。

### モーダルのコンポーネント階層

```
src/renderer/components/app/
  PicturesDialog/
    PicturesDialog.tsx
    PictureList.tsx
    PicturePreview.tsx
    PictureForm.tsx
  LyricsDialog/
    LyricsDialog.tsx
    PlainTextTab.tsx
    SynchronizedTab.tsx
    LrcImportButton.tsx
    LrcExportButton.tsx
```

- shadcn の `Dialog` / `Tabs` / `Select` / `Textarea` / `Input` / `Button` を Phase 5 で追加 (`pnpm shadcn add tabs select textarea input dropdown-menu`)。

### Drag & Drop / 不要機能

- モーダル ローカルでの **画像 D&D 追加** は Phase 5 で実装 (UX として欲しいため)。Renderer の `<input type="file">` と並行して、ドロップ ゾーンで `File` を受け、同じ純関数 (`fileToPicture`) で `PictureInfo` 化する。
- 歌詞の高度な機能 (タイムスタンプの自動振り、karaoke 単語単位の同期など) は **v1 では非対応**。Phase 5 で実装しないことを明示。

## 設計方針

- モーダルは **draft state を持つ純関数 + React 関数コンポーネント** で構成し、`Apply` 時にだけ親 (= Phase 4 の編集 store) に編集アクションを発行する。
- 画像バイト列の比較は **deep equal** ではなく `byteLength` + `kind` + `mimeType` + `description` の組で行う (Apply 時の dirty 判定)。同じ画像を Add し直したケースで誤判定はあり得るが、許容する。
- `parseLrc` / `formatLrc` は **テスト可能な純関数**。実 LRC 仕様の subset (時間タグ + テキスト) のみ対応し、enhanced LRC ([00:00.00] 内の `<00:01.00>` ワード タイミング) は無視する。
- 画像プレビューの `URL.createObjectURL` は **モーダルが閉じる時に `URL.revokeObjectURL`** すること。リソース リークを避ける。

## 主要な内部 API (案)

```ts
export const fileToPicture: (file: File) => Promise<PictureInfo>;

export const parseLrc: (text: string) => {
  readonly lines: readonly { timeMs: number; text: string }[];
  readonly meta: Readonly<Record<string, string>>;  // [ar:..] 等
};

export const formatLrc: (
  lines: readonly { timeMs: number; text: string }[],
  meta?: Readonly<Record<string, string>>,
) => string;

export const buildLyricsInfoFromDraft: (draft: LyricsDraft) => LyricsInfo | undefined;
```

## 依存

- Phase 3 (スプレッドシートからのモーダル起動)。
- Phase 4 (編集 store。`Apply` でディスパッチする先)。
- Phase 2 (IPC 基盤。Phase 5 で `mme:dialog:saveFile` / `mme:file:{readBytes,writeBytes}` を追加)。

## テスト方針

- `parseLrc`:
  - 標準 LRC: `[00:12.300]Foo` → `{ timeMs: 12300, text: "Foo" }`。
  - メタデータ行: `[ti:Title]\n[00:00.00]Hi` → `meta: { ti: "Title" }, lines: [{ 0, "Hi" }]`。
  - 空行 / コメント行 (`# ...`) → 無視。
  - 不正な時刻 (`[00:99.99]Foo`) → 警告無し、その行はスキップ (`lines` に含めない)。
- `formatLrc`:
  - 単純ケースで `parseLrc(formatLrc(x)) == x` のラウンドトリップ (時刻の丸めはミリ秒で安定)。
- `buildLyricsInfoFromDraft`:
  - text のみ → `{ unsynchronized, language, description }`。
  - synced のみ → `{ synchronized, language, description }`。
  - 両方 → 両方を持つ `LyricsInfo`。
  - 両方空 → `undefined`。
- `fileToPicture`:
  - JPEG / PNG / WebP / GIF の `mimeType` 推定。
  - 拡張子と Magic Number が食い違ったら **Magic Number 優先**。
- DOM レベル (Phase 4 で Testing Library 入っていれば):
  - PicturesDialog で Add → preview が出る。
  - PicturesDialog で Apply → 親 store に編集アクションが届く。
  - LyricsDialog の Tabs 切り替え。
- Pictures / Lyrics の core 連携 (saveTrack まで通す Round-trip) は Phase 6 で担保 (Phase 5 ではメモリ内編集に閉じる)。

## 完了条件 (DoD)

- スプレッドシートの `pictures` セルをダブル クリックすると Pictures モーダルが開き、Add / Replace / Export / Remove / Kind 編集 / MIME 編集 / Description 編集 が動く。
- Pictures モーダルの Apply で、その行の `Track.pictures` がメモリ上で更新され、行が `dirty` になる。
- スプレッドシートの `lyrics` セルをダブル クリックすると Lyrics モーダルが開き、Plain text / Synchronized 両方が編集できる。LRC の Import / Export が動く。
- 未対応フォーマット (= `supportsPictures: false` / `supportsLyrics: false`) はモーダルが開かず Toast で案内。
- `parseLrc` / `formatLrc` / `fileToPicture` / `buildLyricsInfoFromDraft` の純関数に `*.test.ts` がある。
- `mme:dialog:saveFile` / `mme:file:writeBytes` / `mme:file:readBytes` が IPC contract に追加され、ハンドラがある。
- `pnpm -r typecheck` / `pnpm -r test` / `pnpm check` が緑。

## 参考資料

- ID3v2 APIC: <https://id3.org/id3v2.4.0-frames#Attached_picture>
- LRC フォーマット: <https://en.wikipedia.org/wiki/LRC_(file_format)>
- core の `PictureInfo` / `LyricsInfo`: `packages/core/src/types.ts`
- shadcn/ui Dialog: <https://ui.shadcn.com/docs/components/dialog>
- shadcn/ui Tabs: <https://ui.shadcn.com/docs/components/tabs>
