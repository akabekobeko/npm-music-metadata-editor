# Phase 3: Spreadsheet UI & Read

## 目的

GUI の主体である **スプレッドシート (列 = メタデータ、行 = 音楽ファイル)** を立ち上げ、ファイルを開いて core の `Track` を行として並べるところまでを動作させる。このフェーズの成果物は **読み取り専用 (編集はまだ動かない)**。Phase 4 で編集を載せる前に、列定義 / レンダリング / 未対応セルの表示・無効化マトリックスを確定させるのが狙い。

## スコープ

### スプレッドシート ライブラリ選定

Phase 3 冒頭で 3 候補を 1 日程度の PoC で評価し、1 つに採用する。評価項目とスコアリング:

| 候補               | 採用判断ポイント                                                           |
| ------------------ | -------------------------------------------------------------------------- |
| **Glide Data Grid**  | Canvas 描画で 1 万行スクロール OK、列ヘッダー固定 / 列幅リサイズ / 範囲選択 / コピペが標準。MIT。shadcn/ui との見た目統一はテーマ オーバーライドで頑張る必要がある。 |
| **TanStack Table v8**| ヘッドレス。レンダリングは自分で書くので shadcn/ui に完全に揃えやすい。範囲選択 / コピペは自前実装。仮想スクロールは `@tanstack/react-virtual` で別途。 |
| **RevoGrid**         | Web Components。Excel ライクな UX、コピペや列固定が箱出しで動く。React 連携はあるが shadcn と組み合わせにくい。 |

評価は **PoC ブランチで 3 つとも最低限の表 (10 行 × 10 列、1 列固定、範囲選択 + コピペ) を作って比較**する。判断は次の優先順位:

1. **複数セル選択 → クリップボードからの列ペースト** が素直に書けるか (要件で必須)。
2. **行数 1,000 〜 10,000** までスムーズにスクロールするか (1 ライブラリにつき行数を変えてベンチ)。
3. **未対応セルの disabled 表示** をセル単位でカスタマイズできるか。
4. **shadcn/ui のテーマ (light/dark)** に合わせやすいか。

PoC の所感を `docs/pkg/gui/plan/phase-03-spreadsheet.md` の末尾 (このファイル) に追記し、結論を書き残す。**PoC 結果が想定と違ったらこの計画書を更新してから先に進む**。

> **既定の方針**: 上記の優先順位で評価した結果、要件が「列ペースト + フォーマット差での disabled」を含むため、**Glide Data Grid を第一候補**とする。最終判断は PoC で。

### 列定義

列は core の `TagData` / `pictures` / `chapters` / `lyrics` から導出する。Phase 3 では下記をハードコード相当で並べ、Phase 6 で「ON/OFF 設定」を JSON 永続化する:

| #  | カラム ID         | データ ソース                       | 既定表示 | 編集 (Phase 4 以降) | 備考                                                   |
| -- | ----------------- | ----------------------------------- | -------- | ------------------- | ------------------------------------------------------ |
| 1  | `fileName`        | `path.basename(filePath)`           | 表示     | 不可                | **常時表示・編集不可・列固定**。tooltip でフルパス。   |
| 2  | `audioFormat`     | `Track.audioFormat`                 | 表示     | 不可                | format 列。disabled 表示。                              |
| 3  | `durationMs`      | `Track.durationMs`                  | 表示     | 不可                | `m:ss` 整形して表示。                                  |
| 4  | `tag.title`       | `Track.tag.title`                   | 表示     | 可                  |                                                        |
| 5  | `tag.artist`      | `Track.tag.artist`                  | 表示     | 可                  |                                                        |
| 6  | `tag.album`       | `Track.tag.album`                   | 表示     | 可                  |                                                        |
| 7  | `tag.albumArtist` | `Track.tag.albumArtist`             | 表示     | 可                  |                                                        |
| 8  | `tag.trackNumber` | `Track.tag.trackNumber`             | 表示     | 可                  | `track / total` の合成表示は Phase 4 で。              |
| 9  | `tag.trackTotal`  | `Track.tag.trackTotal`              | 非表示   | 可                  | 既定では off、列表示で on にできる (Phase 6)。          |
| 10 | `tag.discNumber`  | `Track.tag.discNumber`              | 非表示   | 可                  |                                                        |
| 11 | `tag.discTotal`   | `Track.tag.discTotal`               | 非表示   | 可                  |                                                        |
| 12 | `tag.year`        | `Track.tag.year`                    | 表示     | 可                  |                                                        |
| 13 | `tag.genre`       | `Track.tag.genre`                   | 表示     | 可                  |                                                        |
| 14 | `tag.composer`    | `Track.tag.composer`                | 非表示   | 可                  |                                                        |
| 15〜| `tag.*` の残り    | `TagData` の全フィールド            | 非表示   | 可                  | `conductor / lyricist / publisher / copyright / comment / group / description / language / isrc / productId / recordingDate / originalReleaseDate / publishingDate / bpm / rating` を網羅。 |
| -  | `pictures`        | `Track.pictures.length`             | 表示     | モーダル            | セルは「件数 + Cover Front の有無」を表示、ダブル クリックでモーダル (Phase 5)。 |
| -  | `lyrics`          | `Track.lyrics`                      | 表示     | モーダル            | `none` / `text` / `synced` のサマリー表示、ダブル クリックでモーダル (Phase 5)。 |
| -  | `chapters`        | `Track.chapters.length`             | 非表示   | -                   | 表示は OK、編集は v1 では非対応 (Phase 7 の deferred)。 |
| -  | `warnings`        | `Track.warnings.length`             | 表示     | 不可                | 0 件以外は警告アイコン + tooltip で内容を表示。       |

列定義は **`src/renderer/features/spreadsheet/columns.ts`** に純関数化したテーブルとして置く。`TagData` の型から派生させるので、core で `TagData` にフィールドを増やすと型エラーで GUI 側に列追加を促せる構造にする (`type ColumnId = | "fileName" | "audioFormat" | ...` を `TagData` の `keyof` から組み立てる)。

### フォーマット対応マトリックスと disabled セル

- Phase 2 で実装した `mme:formatSupport:list` を起動時に呼び、`Map<AudioFormat, FormatSupportEntry>` を Renderer のメモリに保持。
- 各セルの `(rowFormat, columnId)` が `entry.writableTagFields` / `entry.supportsPictures` / `entry.supportsChapters` / `entry.supportsLyrics` のいずれにも入っていない場合、**そのセルを disabled (グレーアウト + 編集不可 + ペースト無視)** にする。
- 表示そのものは disabled でも値があれば見せる (例: WAV の `picture` 件数表示は OK、編集は不可)。

### 状態モデル

```
src/renderer/features/tracks/
  store.ts                  # useReducer ベースの track state (Phase 3 の最小)
  selectors.ts              # 派生値 (列ごとの値、warnings 件数 etc) は純関数
  loadTracks.ts             # IPC 経由で Track を読む (loadMany)
  types.ts                  # TrackRow = { filePath, track, dirty, format, ... }
```

- 行 (`TrackRow`) の identity は **`filePath` (絶対パス)**。同じパスを 2 度開いた場合は **後勝ちで上書き** (重複行は作らない)。
- 状態は当面 `useReducer` で済ます。Phase 4 で編集が乗ったタイミングで Zustand 化を再評価する。
- 現状の `Track` (= core から読んだ最新) と `dirty` フラグ (Phase 4 以降で意味を持つ) を行ごとに保持。Phase 3 では `dirty` は常に `false`。

### ファイルを開く UX

- メニュー: **File → Open Audio Files…** (`Cmd/Ctrl+O`)。`mme:dialog:openFiles` を呼ぶ。
- 空の状態の Renderer には「ファイルを開く」ボタンを表示 (空状態 / Empty State コンポーネント)。
- D&D は Phase 7 で実装 (Phase 3 の段階ではダイアログのみ)。
- 読み込み中は **行ごとに skeleton セル**を出す。`loadMany` は並列なので、完了したファイルから順に row が埋まる。

### 表示まわりの細部

- `fileName` 列は **常時左端に固定**。スクロール時にも見える。
- 行ヘッダー (左端の番号) は出さない。`fileName` がそれを兼ねる。
- 列ヘッダーには **書き込み可能数** をグレーで併記 (例: `Title (5/5)` … 開いている 5 行のうち 5 行が書き込み可)。disabled 行があるときに気付ける。
- セルの値が `undefined` のときは空文字 (空セル) で表示。`""` (空文字) のときも空セル。区別しない。
- `warnings` 列は **件数 + 警告アイコン**。アイコンに hover すると `Warning.message` の一覧が tooltip で出る。`severity: "error"` が混じる行は赤系、`"warn"` のみは黄系、`"info"` のみは灰系。
- duration は `m:ss` (1 時間越えは `h:mm:ss`) 形式で表示。秒未満は切り捨て。

### モーダル / 詳細ペインの方針

- Phase 3 では **モーダルは出さない**。Pictures / Lyrics の詳細編集は Phase 5。
- `pictures` / `lyrics` のセルをダブル クリックされたら、Phase 3 では「Phase 5 で対応予定」を Toast (`sonner` を導入するかは Phase 5 で決定。Phase 3 は `alert` 相当で良い) で出す程度にとどめ、UI 配線だけ通しておく。

### コンポーネント階層 (Phase 3 で作るもの)

```
src/renderer/components/app/
  AppShell.tsx              # 全体レイアウト (header + main + status bar)
  Header.tsx                # File メニュー、Open ボタン、開いてるファイル数
  EmptyState.tsx            # 何も開いていない時の表示
  Spreadsheet/
    Spreadsheet.tsx         # 選定した library のラッパー
    cells/
      TextCell.tsx
      NumberCell.tsx
      DurationCell.tsx
      PicturesSummaryCell.tsx
      LyricsSummaryCell.tsx
      WarningsCell.tsx
      DisabledCell.tsx      # フォーマット未対応セル用
    fileName/
      FileNameHeaderCell.tsx
      FileNameCell.tsx      # tooltip で full path
```

## 設計方針

- スプレッドシート コンポーネントは **値レンダリングのみを担当**し、編集ロジックは Phase 4 で別レイヤーに切る。Phase 3 で「読み取り → 編集」へ書き換える際の差分が「セルのレンダラー差し替えと onCellEdited の追加」だけで済むようにする。
- 列定義テーブル (`columns.ts`) は **純関数で生成**する (`buildColumns(visibleIds, formatSupport): readonly Column[]`)。React の useMemo に乗せて再計算を最小化する。
- `Track` から行への射影は **selectors の純関数**で行い、cell の render 関数では if 分岐を書かない (cell は値だけ受け取る)。
- shadcn/ui の `Tooltip` / `Button` / `Dialog` を Phase 3 で追加 (`pnpm shadcn add tooltip button dialog`)。

## 主要な内部 API (案)

```ts
export type TrackRow = {
  readonly filePath: string;
  readonly track: Track;
  readonly dirty: boolean;        // Phase 4 で意味を持つ
};

export type ColumnId = "fileName" | "audioFormat" | "durationMs" | "warnings"
  | `tag.${keyof TagData}` | "pictures" | "lyrics" | "chapters";

export type ColumnDefinition = {
  readonly id: ColumnId;
  readonly title: string;
  readonly width: number;
  readonly editable: "never" | "tag" | "modal";   // Phase 4 / 5 で利用
  readonly readValue: (row: TrackRow) => string | number | undefined;
};

export const buildColumns: (
  visibleIds: readonly ColumnId[],
  support: ReadonlyMap<AudioFormat, FormatSupportEntry>,
) => readonly ColumnDefinition[];

export const isCellWritable: (row: TrackRow, columnId: ColumnId, support: ...) => boolean;
```

## 依存

- Phase 1 (パッケージ骨格)。
- Phase 2 (`mme:dialog:openFiles` / `mme:track:loadMany` / `mme:formatSupport:list`)。

## テスト方針

- `buildColumns(visibleIds, support)` は (a) 既定の visibleIds (b) 全 ON (c) 全 OFF (= fileName 固定列だけ残る) のスナップショットで列順を固定。
- `isCellWritable` は (a) MP3 + `tag.title` → true (b) WAV + `pictures` → false (c) FLAC + `tag.bpm` → core の対応に従う、を検証。
- `selectors.formatDuration(durationMs)` は `0` / `1500` / `3661000` / `undefined` で `0:00` / `0:01` / `1:01:01` / `""` を返すこと。
- `loadTracks` は IPC をモックし、(a) 全成功で N 行入る (b) 一部失敗で error 表示 (c) 重複パス開きは後勝ち を確認。
- スプレッドシート コンポーネント自体の DOM テストは **Phase 3 では入れない**。選定したライブラリが Canvas ベースの場合は React Testing Library で値が出ているかを assert しにくいため、Phase 4 の編集テストでまとめて担保する。
- フィクスチャ: core / cli の生成スクリプトと同じ規約で `packages/gui/scripts/fixtures/` を作る。Phase 3 では MP3 / FLAC / WAV を 1 つずつ。

## 完了条件 (DoD)

- スプレッドシート ライブラリの選定結果がこの計画書末尾 ("ライブラリ選定の結論" セクション) に追記されている。
- メニュー / ボタン経由でファイル ダイアログが開き、選んだ複数ファイルが行として並ぶ。
- `fileName` 列が左端に固定で、tooltip にフルパスが出る。
- フォーマットの対応マトリックスに従って disabled セルがグレーアウトされている。
- `warnings` 列が件数 + tooltip で警告内容を表示している。
- セルのダブル クリックで編集 / モーダルが開かない (Phase 4/5 で実装する旨のトースト or NO-OP)。
- 列定義 / selectors / loadTracks の純関数部分に `*.test.ts` がある。
- `pnpm -r typecheck` / `pnpm -r test` / `pnpm check` が緑。

## 参考資料

- Glide Data Grid: <https://github.com/glideapps/glide-data-grid>
- TanStack Table: <https://tanstack.com/table/v8>
- TanStack Virtual: <https://tanstack.com/virtual/latest>
- RevoGrid: <https://github.com/revolist/revogrid>
- core の `FormatSupport` 派生表 (Phase 2): `packages/gui/src/main/ipc/formatSupport/matrix.ts`
- 先行 GUI のスプレッドシート: Mp3tag (Windows) のメイン ビュー、kid3 のリスト ビュー

## ライブラリ選定の結論 (PoC 後に記入)

> Phase 3 開始時点で PoC を行い、以下を埋める。
>
> - 採用ライブラリ: ___
> - 理由: ___
> - 不採用ライブラリの不採用理由: ___
> - 後段フェーズへの含意 (例: コピペ実装の起点ファイル名): ___
