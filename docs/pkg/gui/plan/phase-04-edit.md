# Phase 4: Cell Edit & Clipboard

## 目的

Phase 3 で立ち上げた読み取り専用スプレッドシートに **セル単位の編集** と **列方向のクリップボード ペースト** を載せる。Phase 6 で書き込み (`saveTrack`) を呼ぶ前に、Renderer メモリ上の `Track` を編集できる状態を整え、未対応セル / フォーマット差を UI でユーザーに伝える役目もこのフェーズで完成させる。

## スコープ

### セル編集の基本フロー

1. ダブル クリック / `Enter` / 文字入力で **編集モード入り** (列の `editable` 属性が `"tag"` の場合のみ)。
2. テキスト / 数値の入力 → `Enter` で **コミット**、`Esc` で **キャンセル**。
3. コミット時に Renderer 内の `TrackRow.track.tag.<field>` を更新し、`dirty: true` を立てる。**core への書き込みは行わない** (Phase 6)。
4. 編集中のセルは shadcn の `Input` (テキスト) / `Input type="number"` (数値) を **オーバーレイ**で重ねる。Glide Data Grid を採用した場合はビルトインのエディタで賄えるなら賄い、shadcn テーマと衝突したらカスタム editor で差し替える。
5. 編集対象が disabled セル (フォーマット未対応 or `editable: "never"`) の場合は **そもそも編集モードに入らない**。

### セル種別ごとの入力検証

| セル                  | 入力 → 内部値の変換                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `tag.title` 等の文字列 | 空文字 → `undefined` (= タグ削除と同義)。先頭/末尾の trim は **行わない** (歌詞混じりを尊重)。 |
| `tag.year`            | 4 桁の整数のみ受理。未入力 → `undefined`。範囲外 (`< 1` または `> 9999`) → エラー表示してコミット拒否。 |
| `tag.trackNumber` / `discNumber` / `trackTotal` / `discTotal` | 1〜99999 の整数。`0` / 未入力 → `undefined`。 |
| `tag.bpm`             | 1〜999 の整数。`0` / 未入力 → `undefined`。                                                 |
| `tag.rating`          | 0〜5 の半整数。**Phase 4 では UI を Slider にせず**、`0`〜`5` の数値入力で受け取り、内部で `value/5` に正規化して `0..1` を保存。Phase 5 で星 UI を検討。 |
| `tag.recordingDate` / `originalReleaseDate` / `publishingDate` | `YYYY` / `YYYY-MM` / `YYYY-MM-DD` / `YYYY-MM-DDTHH:mm:ss` のいずれかを文字列で受理。それ以外は拒否。 |
| `tag.language`        | ISO-639 の 3 文字 (例: `eng`)。文字列のまま受け入れ、Validation は `^[a-z]{2,3}$` に留める。 |
| `tag.genre` / `tag.composer` 等のフリー テキスト | 文字列をそのまま (空 → `undefined`)。 |

検証ロジックは `src/renderer/features/edit/validators.ts` に純関数として置き、各セルの `commit(value)` から呼ぶ。失敗時は **stderr ではなく** Renderer 上に `ValidationFeedback` を返し、エディタに赤枠 + Tooltip でメッセージを表示する。

### dirty 管理

```
TrackRow = {
  filePath: string;
  track: Track;          // 表示用 (= 編集後の最新)
  origin: Track;         // 直近の load 結果 (比較用)
  dirty: boolean;        // origin と track の差分があれば true
}
```

- Phase 4 では **`origin` をスナップショットとして保持**し、各 commit 後に `track.tag` / `track.pictures` 等と比較して `dirty` を再計算する。
- `dirty` 行は **fileName セルの先頭にドット (•) を出す** (Mp3tag や VS Code のタブと同じ慣習)。
- 「すべての変更を破棄」(File → Revert) は Phase 6 で実装。Phase 4 では UI 配線だけ通しておき、`reverted` 動作は単に `track = origin` を代入する純関数で書く。

### Undo / Redo

- Phase 4 では **セル単位の入力中 Undo (`Cmd/Ctrl+Z` で直前の値に戻す)** までを実装。
- 行 / アプリ単位の操作履歴 (複数セル ペースト一括 Undo、ファイル追加 Undo など) は **Phase 7 の deferred** として残し、Phase 4 では着手しない。Mp3tag の Undo は深いがそこまでは目指さない。

### 列ペースト (要件のキモ)

要件: **列を選択 → クリップボードからペースト**。OS のコピー元 (Excel / 別の Mp3tag / ブラウザの表) で 1 列分のテキストをコピーし、Renderer 上で **対象列の N 行に縦方向で貼る** ことを期待する。

仕様:

1. ユーザーが **列ヘッダーをクリック**して列全体を選択、または **複数行 × 1 列を範囲選択**する。
2. `Cmd/Ctrl+V` で `navigator.clipboard.readText()` を読み、**改行 (`\r\n` / `\n` / `\r`) で行に分割**する。`\t` 区切りでも 1 列扱い (= 先頭セルのみ採用) にする。
3. 分割した値を **選択範囲の各行に当てる**。
   - **列選択 + クリップボード 1 値 → 全行に broadcast** (Numbers / Excel 互換の「列選択 = 全セル選択」を踏襲、artist 名一括修正のような典型ユース ケースを 1 アクションでカバー)。実装は `features/edit/expandColumnPaste.ts` の純関数。
   - 列選択 + クリップボード 2 値以上 → 行 0 から 1:1 で当てる。クリップボード行数 > 選択行数なら余りを破棄、行数 < 選択行数なら **不足分は何もしない (上書きしない)**。Excel 互換のフィルではなく、複数値ペーストではあくまで「ユーザーが用意した分だけ」を尊重する方針。
   - 単一セル選択 + クリップボード → 先頭 1 値のみそのセルへ。
4. ペースト先のセルが **disabled (= フォーマット未対応 / `editable: "never"`)** の場合、そのセルは **空振り**して飛ばす。stderr にメッセージは出さないが、ペースト後に右下のステータス バーに `Pasted N values, skipped M unsupported cells` を表示する。
5. ペースト先の各セルでも **入力検証**を通す。検証に失敗した値は飛ばし (空振り)、ステータス バーに `skipped M invalid values` を加算する。
6. ペーストは 1 つのトランザクションとして扱い、Undo (`Cmd/Ctrl+Z`) で **一括戻し**できる。

> **Note**: 列の値型ごとに「そもそも列選択を許可するか」「broadcast を許可するか」「Lyrics / Comment のような複数行値のための特殊クリップボード形式を入れるか」を分岐する設計拡張は、Phase 4 のスコープ外として **[`phase-08-column-selection.md`](phase-08-column-selection.md)** に切り出した。Phase 5 (Pictures / Lyrics modal) と並行 / 直後に着手する想定。

実装責務:

```
src/renderer/features/edit/
  paste.ts                # parseClipboardText + applyPaste の純関数
  paste.test.ts
  expandColumnPaste.ts    # 列選択時の broadcast 規則 (純関数)
  expandColumnPaste.test.ts
  validators.ts
  validators.test.ts
  store.ts                # 編集トランザクション (apply / revert / undo)
  store.test.ts
```

`parseClipboardText(text): readonly string[]` と `applyPaste(rows, columnId, values, support): { applied, skippedUnsupported, skippedInvalid }`、それに `expandColumnPaste({ values, mode, totalRows })` を純関数として切り、UI 層 (`AppShell.handlePaste`) は **parse → expand → apply** の順で組み合わせるだけにする。

### 行 (ファイル) のコピペ

- 要件には **行コピー** は明示されていないが、Excel との往復で「Title 列をコピーして他のソフトに貼る」操作はあるので **コピー (`Cmd/Ctrl+C`)** は単純実装で備える。選択範囲のセル値を `\t` / `\n` 区切りでクリップボードに書く。
- Phase 4 ではコピーの実装は **テキスト書き込みのみ** (HTML テーブル等は出さない)。Mp3tag 互換まで深追いしない。

### キーボード ナビゲーション

- 矢印キー: セル移動。
- `Tab` / `Shift+Tab`: 次 / 前のセル (同行の編集セルだけ巡回。disabled はスキップ)。
- `Enter` / `Shift+Enter`: 同列の次 / 前の行 (Excel 互換)。
- `Esc`: 編集キャンセル。
- 編集中は `Enter` がコミット、`Shift+Enter` は **改行を入れない** (free-form text でも改行は禁止。歌詞のように複数行が必要な値は Phase 5 のモーダルで扱う)。

### `tag.trackNumber / trackTotal` などの補助 UI

- ペアになる列が 2 列に分かれていると Mp3tag の `track / total` 慣習と揃いにくい。Phase 4 では **2 列構成のまま**にしつつ、列ヘッダのキャプションを `Track #` / `Track Total` のように明確化する。
- ヘッダ右クリックの「列の固定/結合」UI は **入れない**。シンプルに保つ。

### ステータス バー

- 画面下部に `<rows>個のファイル / <dirty>件 編集中 / <warnings>件 警告` を常時表示。
- ペースト直後は **5 秒間** 結果サマリーを末尾に挿入 (`Pasted 12 values, skipped 3 unsupported, 0 invalid`)。

## 設計方針

- 編集ロジックは Spreadsheet コンポーネントから **完全に独立**させる。`onCellEdited(row, column, value)` をコールバックで受け、編集 store にディスパッチする形。これによりライブラリ差し替え (Phase 3 の選定が破綻した場合) のコストを下げる。
- `validators` / `parseClipboardText` / `applyPaste` は **純関数 + Plain Object** で書き、副作用 (Clipboard / Spreadsheet API) は呼び出し側に押し出す。
- 同時編集 (複数行 × 1 列、複数行 × 複数列) は **コピペ経由でのみ実現** し、editing UI は常に 1 セル。Excel 風のフィル ハンドルは Phase 4 では入れない。
- React の `useReducer` で編集トランザクションを管理し、Undo は **直近 N=50 件** のリングバッファで保持。

## 主要な内部 API (案)

```ts
export type ValidationResult =
  | { readonly ok: true; readonly value: string | number | undefined }
  | { readonly ok: false; readonly message: string };

export const validateTagValue: (
  field: keyof TagData,
  raw: string,
) => ValidationResult;

export const parseClipboardText: (raw: string) => readonly string[];

export const applyPaste: (
  rows: readonly TrackRow[],
  columnId: ColumnId,
  values: readonly string[],
  support: ReadonlyMap<AudioFormat, FormatSupportEntry>,
) => {
  readonly applied: number;
  readonly skippedUnsupported: number;
  readonly skippedInvalid: number;
  readonly nextRows: readonly TrackRow[];
};

export const editReducer: (state: EditState, action: EditAction) => EditState;
```

## 依存

- Phase 3 (スプレッドシート、列定義、フォーマット対応マトリックス、`TrackRow`)。
- Phase 2 (IPC は使わない。編集はメモリ内のみ)。

## テスト方針

- `validateTagValue` は表 ("セル種別ごとの入力検証") の各行を網羅。失敗ケースも 1 つずつ assert。
- `parseClipboardText`:
  - `"a\nb\nc"` → `["a", "b", "c"]`
  - `"a\r\nb\r\nc\r\n"` → `["a", "b", "c"]` (末尾 `\n` の空文字は除去)
  - `"a\tx\nb\ty"` → `["a", "b"]` (1 列目だけ)
  - `""` → `[]`
- `applyPaste`:
  - 値数 == 行数 → 全部適用、`skipped = 0`。
  - 値数 > 行数 → 余り破棄。
  - 値数 < 行数 → 不足分は元の値のまま、`applied = 値数`。
  - disabled 行 → `skippedUnsupported++`、その行の値は変えない。
  - 数値列 + 不正値 → `skippedInvalid++`。
- `expandColumnPaste`:
  - `mode: "column"` + 値数 1 → 全行 broadcast (totalRows 分の同値配列を返す)。
  - `mode: "column"` + 値数 > 1 → 入力をそのまま返す (1:1 paste)。
  - `mode: "cell"` → 入力をそのまま返す (broadcast しない)。
  - `totalRows <= 0` / 値数 == 0 → 入力をそのまま返す (no-op)。
- `editReducer`:
  - `commit` → `dirty: true` が立つ。
  - 同じ値で `commit` → `dirty` は origin と比較した結果で決まる。
  - `undo` → リング バッファから直前状態に戻る。
  - `revert(filePath)` → `track = origin`。
- DOM レベルのテストは React Testing Library を導入してでも 2〜3 ケース入れる:
  - ダブル クリックで編集モードに入る → `Enter` で commit → cell 表示が更新される。
  - disabled セルではダブル クリックしてもエディタが出ない。
  - クリップボード モック (`navigator.clipboard.readText`) を差し替えて、`Ctrl+V` で複数行ペーストできること。

## 完了条件 (DoD)

- 編集対象のセルがダブル クリック / Enter / 文字入力で編集モードに入り、`Enter` でコミット / `Esc` でキャンセルできる。
- disabled セル (フォーマット未対応 / `editable: "never"`) は編集モードに入らない。
- セル単位の Undo (`Cmd/Ctrl+Z`) が動く。
- 列選択 → `Cmd/Ctrl+V` で `navigator.clipboard.readText()` の内容を縦方向にペーストできる。**クリップボード 1 値の場合は全行 broadcast**、複数値の場合は行 0 から 1:1。disabled セルはスキップ、不正値はスキップ、結果サマリーがステータス バーに出る。
- `dirty` 行が fileName セルの先頭ドットで識別できる。
- `validators` / `parseClipboardText` / `applyPaste` / `expandColumnPaste` / `editReducer` の純関数に `*.test.ts` がある。
- `pnpm -r typecheck` / `pnpm -r test` / `pnpm check` が緑。

## 参考資料

- Mp3tag のセル編集 / 列ペースト UX (動作確認資料として、ユーザーが手元で操作)
- Glide Data Grid の `onPaste` API: <https://docs.grid.glideapps.com/api/dataeditor#onpaste>
- TanStack Table の Selection / Editable Cell パターン: <https://tanstack.com/table/v8/docs/framework/react/examples/editable-data>
- core の `TagData` 型: `packages/core/src/types.ts`
