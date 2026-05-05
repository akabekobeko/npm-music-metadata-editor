# Phase 8: Column Selection Type Branching

## 目的

Phase 4 で導入した「列選択 (= 列ヘッダー クリックでその列の全行を選択) → クリップボード ペースト」を、**列が表現する値の種類** に応じて動作分岐できるようにする。具体的には次の 2 点を満たす:

1. 改行を含み得る列 (例: `Lyrics`, `Comment`) は **列選択そのものを禁止**するか、または特殊なクリップボード形式で安全にラウンドトリップさせる。
2. 「列選択 + 1 値ペースト = 全行 broadcast」「列選択 + 複数値ペースト = 1:1」という Phase 4 の動作を、列ごとに opt-in / opt-out できるようにする。

Phase 4 完了時点では **すべての editable 列が "column" 選択可** になっており、`Lyrics` 列を列選択して 1 値ペーストすると意図せず全ファイルの歌詞を上書きしてしまう。本フェーズでこの危険を構造的に排除する。

## スコープ

### 1. `ColumnDefinition.selectable` の導入

```ts
export type ColumnSelectability = "column" | "cell-only";

export type ColumnDefinition = {
  // ...既存フィールド
  /**
   * 列ヘッダー クリックで列全体を選択できるかどうか。省略時は `"column"`。
   * `"cell-only"` の列はヘッダー クリックでは選択されず、セル単位のクリック
   * からのみ編集できる (= 列方向 broadcast の対象外になる)。
   */
  readonly selectable?: ColumnSelectability;
};
```

- 既定値: `"column"` (Phase 4 の動作を維持)。
- `Lyrics`: `"cell-only"` (Phase 5 の Lyrics モーダル経由で編集する前提)。
- `Comment`: 検討。改行を含む使い方が現実的なら `"cell-only"`。短文コメントが大半なら `"column"` を維持し、改行が混じるクリップボードのときだけ警告する案も。
- `Pictures`: 既に `editable: "modal"` で対象外だが、明示的に `"cell-only"` を入れる。
- 数値 / 短文 (year / artist / title / genre / 等): `"column"` のまま。

### 2. ヘッダー クリックの分岐

`Spreadsheet.tsx` の `handleColumnHeaderClick` を以下のように分岐:

```ts
const handleColumnHeaderClick = (columnId: ColumnId): void => {
  const column = findColumn(columnId);
  if (!column || column.selectable === "cell-only") {
    return;  // 列選択しない (= no-op)
  }
  setSelection({ kind: "column", columnId });
  setEditing(null);
};
```

- `cell-only` の列はヘッダー クリックで何も起きない。
- ヘッダー UI 側で `cursor-pointer` を外し、tooltip で「この列はセル単位で編集してください」案内する。

### 3. broadcast 規則の opt-out

`expandColumnPaste` 自体は引数 `mode === "column"` を受け取れば broadcast 判定を返すが、cell-only 列はそもそも `mode === "column"` で呼ばれないため、Phase 8 で追加コードは不要 (Phase 4 で既に分離されている)。

ただし将来「列選択は許可するが broadcast はさせたくない (例: トラック番号を全行同じにすると壊れる)」というニーズが出てきた場合に備え、`ColumnDefinition.broadcast?: "fill" | "first-only"` のような追加プロパティを後付けで入れられる構造を保つ。

### 4. 改行を含むセルの特殊クリップボード形式 (Optional)

歌詞のように複数行を 1 セルに保持する列を、それでも「列方向にコピー / ペースト」したい場合の選択肢:

- (A) **採用見送り** — `cell-only` にして列方向の操作を一切禁止。**推奨案**。Lyrics は Phase 5 のモーダルで完結させる。
- (B) **HTML 形式 + プレーン テキスト 2 重書き** — `clipboard.write` で `text/html` (テーブル) と `text/plain` (改行を ` ` 等にエスケープ) の両方を載せる。OS / 受け側のサポートが分かれるので工数高め。
- (C) **JSON 形式** — `application/json` MIME で `[{value: "..."}]` をクリップボードに書き、受け取り側で `parseClipboardText` の前にこれを優先解釈する。アプリ内コピペは安全だが他アプリとのラウンドトリップが効かない。

Phase 8 では **(A) を既定** とし、(B) / (C) は将来の追加要件として `## 非ゴール` に記録する。

### 5. Renderer のステータス バー / Tooltip の文言

- ヘッダー クリックで列選択できなかった場合、ステータス バーに `<column> はセル単位で編集してください (5 sec)` を transient で出すと操作不能感を減らせる。
- `cell-only` 列のヘッダーには `title` / Tooltip で恒常的に説明を出す。

## 設計方針

- `ColumnDefinition.selectable` は **型として opt-out** (デフォルト `"column"`) にし、既存の column registry を全部書き換えなくて済むようにする。新規列を増やしたときに「明示しなければ選択可」になるのは Phase 4 の動作に揃える妥当な既定値。
- 分岐ロジックは Spreadsheet コンポーネントから外に出し、`features/spreadsheet/isColumnSelectable.ts` のような純関数に置く (テスト可能化)。
- broadcast の制御を将来追加するときに ColumnDefinition の表面が肥大しないよう、関連プロパティは `selection?: { selectable: ...; broadcast?: ... }` のようにグルーピングする案も検討。

## 主要な内部 API (案)

```ts
export type ColumnSelectability = "column" | "cell-only";

export const isColumnSelectable = (column: ColumnDefinition): boolean =>
  (column.selectable ?? "column") === "column";
```

## 依存

- Phase 4 (列選択 / broadcast / `ColumnDefinition` / `Spreadsheet.handleColumnHeaderClick`)
- Phase 5 (Pictures / Lyrics モーダル — `Lyrics` 列を `cell-only` にする決定はここで成立)

依存関係上は Phase 5 と並行 / 直後に着手するのが理想。Phase 5 の DoD でも「Lyrics 列を列選択した状態で 1 値ペーストすると全行が上書きされてしまう」という既知のフットガンが解消されないため、**Phase 5 と同じバージョンで取り込む** 想定。

## テスト方針

- `isColumnSelectable` の純関数テスト (省略時 / `"column"` / `"cell-only"`)
- DOM テスト: `cell-only` 列のヘッダーをクリックしても `selection.kind === "none"` のまま (= 続けて Cmd+V してもペーストが起きない)
- 既存の Phase 4 DOM テスト (`Spreadsheet.test.tsx`) は引き続き緑であること

## 完了条件 (DoD)

- `ColumnDefinition.selectable` が型に追加され、`Lyrics` / `Pictures` (および必要に応じて `Comment`) が `"cell-only"` になっている。
- `cell-only` 列のヘッダーをクリックしても列選択状態にならず、その状態で Cmd+V してもペーストが発火しない。
- `cell-only` 列のヘッダーが Tooltip で操作不能であることをユーザーに案内する。
- 単体テスト + DOM テスト追加。
- `pnpm -r typecheck` / `pnpm -r test` / `pnpm check` が緑。

## 非ゴール

- 改行を含むセルを TSV / HTML / JSON でクリップボード ラウンドトリップさせる仕組みは入れない (オプション B / C)。必要になった時点で別フェーズを切る。
- 「列選択は許可するが broadcast 禁止」のような細粒度制御は入れない。Phase 4 の broadcast 規則と二者択一 (`column` / `cell-only`) で十分とする。

## 参考資料

- Phase 4 の broadcast 仕様: [`phase-04-edit.md`](phase-04-edit.md) の「列ペースト」節
- Numbers / Excel の「列選択 = 全セル選択」UX
- Mp3tag の列ペースト動作 (列選択 + 1 値 = 全行 fill)
