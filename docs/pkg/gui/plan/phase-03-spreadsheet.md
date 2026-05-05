# Phase 3: Spreadsheet UI & Read

## 目的

GUI の主体である **スプレッドシート (列 = メタデータ、行 = 音楽ファイル)** を立ち上げ、ファイルを開いて core の `Track` を行として並べるところまでを動作させる。このフェーズの成果物は **読み取り専用 (編集はまだ動かない)**。Phase 4 で編集を載せる前に、列定義 / レンダリング / 未対応セルの表示・無効化マトリックスを確定させるのが狙い。

## スコープ

### スプレッドシート ライブラリ選定

要件に明示された 3 つを満たすことが最低条件:

1. **セルのインライン編集** (ダブル クリック / Enter / 入力でセル内エディタが立ち上がる)。
2. **セルごとに input type を切り替えられる** (テキスト / 数値 / Select / カスタム → shadcn の `Input` / `Select` / `Textarea` / `Combobox` を **その列の editor として直接置ける** こと)。各列を `editor: (props) => <ReactNode>` で記述できるのがゴール。
3. **複数セル / 列範囲選択 → クリップボードからの列ペースト**。Phase 4 で本実装するが、Phase 3 で「ライブラリ側がペースト経路を許容するか」を確認しておく。

候補を 5 つに広げ、Phase 3 冒頭で **PoC を 1 日程度** 行って 1 つに絞る。評価表:

| 候補                            | License    | インライン編集 | 任意 input type (React editor) | 列ペースト | 列固定 | 仮想スクロール (1〜10k 行) | shadcn/ui との親和性                          |
| ------------------------------- | ---------- | -------------- | ------------------------------ | ---------- | ------ | -------------------------- | --------------------------------------------- |
| **TanStack Table v8** + `@tanstack/react-virtual` | MIT        | 自前実装 (= 完全に自由)                 | ◎ cell renderer に **任意の React** を返せる | 自前 (Phase 4 で実装)             | 自前 (CSS `position: sticky`) | `react-virtual` で別途 | ◎ shadcn の `Input`/`Select`/`Textarea` を素直に埋め込める |
| **react-data-grid** (adazzle)   | MIT        | ○ `renderEditCell` で React を返すだけ | ◎ editor は完全に React        | ○ `onPaste` イベントで実装可     | ○ `frozen` 列        | 標準で内蔵            | ○ 内部スタイルあり、Tailwind と併存可能       |
| **AG Grid Community**           | MIT (Comm) | ○ ビルトイン editor + `cellEditor` で自前可 | ○ React editor 可だが AG Grid の `agInit` に合わせる必要あり | ○ Community でも cell paste 可    | ○ `pinned`           | 標準で内蔵            | △ 独自 DOM が大きく shadcn テーマを上書きしにくい |
| **Glide Data Grid**             | MIT        | ○ `provideEditor` で React オーバーレイ | ○ Canvas + `provideEditor` (HTML) で React 描画は可だが overlay の groove に手が要る | ◎ `onPaste` 標準 | ◎ `freezeColumns` | ◎ Canvas で 100k 行 OK | △ Canvas なので Tailwind は editor overlay にしか効かない |
| **RevoGrid**                    | MIT        | ○ editor を登録 | △ Web Components 内 (Shadow DOM) なので shadcn の Tailwind が届きにくい | ◎ 標準     | ○      | ◎                           | ✗ Shadow DOM の境界で Tailwind が無効化される |

> 凡例: ◎ そのまま要件を満たす / ○ ライブラリの API で十分書ける / △ 工夫が要る / ✗ 要件と合わない。

#### 評価の優先順位 (新要件を反映)

1. **任意 input type の editor が React コンポーネントで書けるか** ★★★ (ユーザー要件で追加)。  shadcn/ui の `Input` / `Select` / `Textarea` / `Checkbox` / `Combobox` をそのまま editor 内で再利用できることを必須にする。
2. **複数セル選択 → 列ペースト** が素直に書けるか (Phase 4 の実装コストを左右)。
3. **行数 1,000 〜 10,000** でスクロール体感が許容範囲か。
4. **未対応セルの disabled 表示** をセル単位で出せるか。
5. **shadcn/ui のテーマ (light/dark)** に乗せやすいか。

PoC では **5 候補のうち上から 3 つ (TanStack Table、react-data-grid、Glide Data Grid)** を実装する。下 2 つ (AG Grid / RevoGrid) は表で除外理由が明確なので PoC 不要。

#### 既定の方針

> **第一候補は TanStack Table v8 + `@tanstack/react-virtual`** に切り替える。理由は次の 3 つ。
>
> 1. 要件 2 (任意 input type を React コンポーネントで切り替えられる) を **API として最も素直に**満たす。ヘッドレスなので cell renderer / editor は React コンポーネントを返すだけで、shadcn の `Input` / `Select` / `Textarea` / `Combobox` をそのまま editor として置ける。
> 2. 列定義 (`columns.ts`) を「型から派生する Plain Object テーブル」として書く設計 (`docs/rules/code-style.md`) と整合する。`columnHelper.accessor` の API が型主導で、`TagData` の `keyof` を直接列に展開できる。
> 3. shadcn/ui との見た目統一が **テーマ調整なしに最初から綺麗に出る**。light/dark 切り替え (Phase 7) も Tailwind の `dark:` 変数だけで完結する。
>
> 弱みは「範囲選択 + クリップボード ペースト + 列固定」を **自前で書く必要がある** 点。ただし Phase 4 で `parseClipboardText` / `applyPaste` を純関数として既に切り出しているため、UI 層の追加コストは「`useState<SelectionRange>` + `onMouseDown` / `onMouseEnter` ハンドラ + `useEffect` で `paste` listener」の 3 ピースで済む見込み。
>
> 第二候補は **react-data-grid (adazzle)**。TanStack Table の自前実装コスト (とくに範囲選択ハンドラ) が PoC で重く出た場合のフォールバック。第三候補は **Glide Data Grid** で、行数 10k を超えるベンチで前 2 つが詰まった場合のスケール保険。
>
> **PoC 結果が想定と違ったらこの計画書を更新してから先に進む**。結論はこのファイル末尾の「ライブラリ選定の結論」に追記する。

### 列定義

列は core の `TagData` / `pictures` / `chapters` / `lyrics` から導出する。Phase 3 では下記をハードコード相当で並べ、Phase 6 で「ON/OFF 設定」を JSON 永続化する:

| #  | カラム ID         | データ ソース                       | 既定表示 | 編集 (Phase 4 以降) | inputKind        | 備考                                                   |
| -- | ----------------- | ----------------------------------- | -------- | ------------------- | ---------------- | ------------------------------------------------------ |
| 1  | `fileName`        | `path.basename(filePath)`           | 表示     | 不可                | -                | **常時表示・編集不可・列固定**。tooltip でフルパス。   |
| 2  | `audioFormat`     | `Track.audioFormat`                 | 表示     | 不可                | -                | format 列。disabled 表示。                              |
| 3  | `durationMs`      | `Track.durationMs`                  | 表示     | 不可                | -                | `m:ss` 整形して表示。                                  |
| 4  | `tag.title`       | `Track.tag.title`                   | 表示     | 可                  | text             |                                                        |
| 5  | `tag.artist`      | `Track.tag.artist`                  | 表示     | 可                  | text             |                                                        |
| 6  | `tag.album`       | `Track.tag.album`                   | 表示     | 可                  | text             |                                                        |
| 7  | `tag.albumArtist` | `Track.tag.albumArtist`             | 表示     | 可                  | text             |                                                        |
| 8  | `tag.trackNumber` | `Track.tag.trackNumber`             | 表示     | 可                  | number           | `track / total` の合成表示は Phase 4 で。              |
| 9  | `tag.trackTotal`  | `Track.tag.trackTotal`              | 非表示   | 可                  | number           | 既定では off、列表示で on にできる (Phase 6)。          |
| 10 | `tag.discNumber`  | `Track.tag.discNumber`              | 非表示   | 可                  | number           |                                                        |
| 11 | `tag.discTotal`   | `Track.tag.discTotal`               | 非表示   | 可                  | number           |                                                        |
| 12 | `tag.year`        | `Track.tag.year`                    | 表示     | 可                  | number           | 4 桁整数。                                              |
| 13 | `tag.genre`       | `Track.tag.genre`                   | 表示     | 可                  | select (free)    | shadcn `Combobox` (datalist 互換)。任意入力可、よくある genre は候補表示。 |
| 14 | `tag.composer`    | `Track.tag.composer`                | 非表示   | 可                  | text             |                                                        |
| -  | `tag.conductor` / `lyricist` / `publisher` / `copyright` / `comment` / `group` / `description` / `isrc` / `productId` | `TagData` の各フィールド | 非表示 | 可 | text             |                                                        |
| -  | `tag.language`    | `Track.tag.language`                | 非表示   | 可                  | select (free)    | ISO-639 候補 (`eng` / `jpn` ...) + 自由入力。           |
| -  | `tag.recordingDate` / `originalReleaseDate` / `publishingDate` | `TagData` の日付系 | 非表示 | 可 | date             | `<Input type="text" inputMode="numeric" />` + ISO-8601 検証 (`YYYY` / `YYYY-MM` / `YYYY-MM-DD`)。 |
| -  | `tag.bpm`         | `Track.tag.bpm`                     | 非表示   | 可                  | number           | 1〜999 の整数。                                         |
| -  | `tag.rating`      | `Track.tag.rating`                  | 非表示   | 可                  | custom           | 星 5 つの `<RatingEditor />` (Phase 4 で実装)。表示は ★/☆ 5 つ。 |
| -  | `pictures`        | `Track.pictures.length`             | 表示     | モーダル            | -                | セルは「件数 + Cover Front の有無」を表示、ダブル クリックでモーダル (Phase 5)。 |
| -  | `lyrics`          | `Track.lyrics`                      | 表示     | モーダル            | -                | `none` / `text` / `synced` のサマリー表示、ダブル クリックでモーダル (Phase 5)。 |
| -  | `chapters`        | `Track.chapters.length`             | 非表示   | -                   | -                | 表示は OK、編集は v1 では非対応 (Phase 7 の deferred)。 |
| -  | `warnings`        | `Track.warnings.length`             | 表示     | 不可                | -                | 0 件以外は警告アイコン + tooltip で内容を表示。       |

> Phase 3 では `inputKind` 列の値を **型として確定 + 各列に設定する** ところまで行う (実際のエディタ コンポーネントは Phase 4 で実装)。`tag.rating` の `<RatingEditor />` のような **custom editor 列が現実に登場する** ことを Phase 3 で型レベルで担保しておくことで、Phase 4 でライブラリ非依存な editor 配線を組みやすくする。

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
  /**
   * 列ごとの input type をここで切り替える (Phase 4 で実体を実装、Phase 3 では型のみ)。
   * - "text"   : `<Input />`
   * - "number" : `<Input type="number" />` + 範囲バリデーション
   * - "select" : `<Select />` + `options` (genre / language の autocomplete 用)
   * - "date"   : `<Input type="text" inputMode="numeric" />` + ISO-8601 検証
   * - "custom" : `editor` フィールドで任意の React コンポーネントを指定
   */
  readonly inputKind: "text" | "number" | "select" | "date" | "custom";
  /** select 用の候補リスト (固定または非同期で解決)。inputKind === "select" のみで使う。 */
  readonly options?: readonly { value: string; label: string }[];
  /**
   * inputKind === "custom" のときに使う editor。受け取った value を `commit(next)` で
   * 親 (= 編集 store) に渡し、`cancel()` でロールバックする。Phase 4 で配線する。
   */
  readonly editor?: (props: CellEditorProps) => React.ReactNode;
};

export type CellEditorProps = {
  readonly row: TrackRow;
  readonly value: string | number | undefined;
  readonly commit: (next: string | number | undefined) => void;
  readonly cancel: () => void;
  readonly disabled: boolean;       // フォーマット未対応セルでは true
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

- TanStack Table: <https://tanstack.com/table/v8>
- TanStack Table Editable Data の例: <https://tanstack.com/table/v8/docs/framework/react/examples/editable-data>
- TanStack Virtual: <https://tanstack.com/virtual/latest>
- react-data-grid (adazzle): <https://github.com/adazzle/react-data-grid>
- react-data-grid `renderEditCell`: <https://adazzle.github.io/react-data-grid/#/CommonFeatures>
- Glide Data Grid: <https://github.com/glideapps/glide-data-grid>
- Glide Data Grid `provideEditor`: <https://docs.grid.glideapps.com/api/dataeditor#provideeditor>
- AG Grid Community: <https://www.ag-grid.com/react-data-grid/>
- RevoGrid: <https://github.com/revolist/revogrid>
- core の `FormatSupport` 派生表 (Phase 2): `packages/gui/src/main/ipc/formatSupport/buildFormatSupportMatrix.ts`
- 先行 GUI のスプレッドシート: Mp3tag (Windows) のメイン ビュー、kid3 のリスト ビュー

## ライブラリ選定の結論

- **採用ライブラリ**: TanStack Table v8 (`@tanstack/react-table` ^8.21) + `@tanstack/react-virtual` ^3.13
- **理由**:
  1. ヘッドレス API なので cell renderer / editor を **任意の React コンポーネント**として返せる。Phase 4 の `inputKind === "custom"` (例: `<RatingEditor />`) を「列定義に書くだけ」で組み込める。
  2. 列定義が型主導 (`columnHelper.accessor`) で、`TagData` の `keyof` から派生した `ColumnId` 型 + `COLUMN_REGISTRY` (`packages/gui/src/renderer/features/spreadsheet/constants.ts`) と素直に噛み合う。`tag.<field>` を増やす際、core 側で `TagData` を広げると型エラーで GUI 側に列追加を促せる構造になっている。
  3. shadcn/ui (Tailwind v4) に **テーマ調整なし**で乗る。Phase 7 の light/dark 切り替えも Tailwind の CSS 変数 (`--background` / `--foreground` / `--muted-foreground` 等) だけで済む。
- **不採用ライブラリ**:
  - **react-data-grid (adazzle)** — 第二候補。要件は満たすが、内部 DOM が固定で shadcn/ui の `<Tooltip>` / `<Dialog>` を埋めにくい。Phase 5 でモーダル / オーバーレイ系を多用するため、editor の自由度を取って TanStack 側を選択。
  - **AG Grid Community** — `agInit` の React アダプタを通すぶん「shadcn のコンポーネントをそのまま editor に置く」だけで済まない。テーマ上書きコストも他の 2 つより重い。
  - **Glide Data Grid** — Canvas で描画するため Tailwind が editor overlay にしか効かず、Phase 5 のモーダル / Phase 7 の light/dark 切り替えでデザインを揃えづらい。
  - **RevoGrid** — Web Components (Shadow DOM) なので Tailwind が境界で無効化される。要件と合わない。
- **後段フェーズへの含意**:
  - 範囲選択 + クリップボード ペースト (Phase 4) は **`Spreadsheet.tsx` (`features/spreadsheet/Spreadsheet/`) に `useState<SelectionRange>` + `onMouseDown` / `onMouseEnter` ハンドラ + `useEffect` の paste listener を追加**して実装する。純関数 `parseClipboardText` / `applyPaste` は `features/spreadsheet/` 配下に新規追加する想定。
  - 列固定は `<col style={{ width }}>` + `position: sticky` で既に実装済み (`Spreadsheet.tsx`)。固定列を増やす場合は `ColumnDefinition.sticky` を `"left" | "right"` 等に拡張する。
  - 仮想スクロールは `@tanstack/react-virtual` の `useVirtualizer` で 1k〜10k 行を現行のまま捌ける見込み。10k 行を超える要件が後段で出たら `Glide Data Grid` をフォールバックに再検討する。
