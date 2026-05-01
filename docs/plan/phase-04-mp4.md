# Phase 4: MP4 / M4A Atoms

## 目的

MP4 (M4A / M4B 含む) コンテナのアトム ツリーをパースし、iTunes 由来の `moov/udta/meta/ilst` 配下に格納されるメタデータの read/write を実装する。

## スコープ

### アトム ツリー パーサー (`src/formats/mp4/atom/`)

- ボックス (atom) の汎用構造: 4 byte size + 4 byte type + payload (+ extended size)
- ネスト構造の再帰パース
- 主要ボックス
  - `ftyp` — ファイル種別 (検出にも使用)
  - `mdat` — メディア データ (パースしない)
  - `moov`, `trak`, `udta`, `meta`, `ilst`
  - `ilst` 配下のメタデータ アトム (`©nam`, `©ART`, `©alb`, `©day`, `©too`, `trkn`, `disk`, `gnre`, `covr`, ...)
  - `----` (freeform / iTunes 拡張: `mean` + `name` + `data`)

### iTunes メタデータ (`src/formats/mp4/itunes/`)

- 既知アトム → `TagData` フィールドのマッピング
- `data` ボックスの type code (UTF-8, UTF-16, BE Signed Int, JPEG/PNG など) に応じた read/write
- `covr` から `PictureInfo` を生成、`PictureInfo` から `covr` を構築
- 不明アトムは raw bytes で保持し、再書き出しできるようにする

### 書き込み戦略

- メタデータ更新後の `moov` サイズ変化に伴って **`mdat` のオフセットがずれる**ことに注意 (シンプルな実装としては、ファイル全体をリビルドする方針を採用。高速化を目的に `free` アトムをパディングとして利用する最適化は **Phase 10 で再検討**)。
- `stco` / `co64` の chunk offset を更新する処理を実装 (これを忘れるとプレイヤーが再生できなくなる)。

### 公開 API への組み込み

- `readMetadata` / `writeMetadata` に MP4 を追加。
- フォーマット検出: `ftyp` の brand から M4A / M4B / MP4 / 3GP などを判定。

## 設計方針

- アトム ツリーは Plain Object のツリー構造として表現する: `type Atom = { type: string; offset: number; size: number; children?: readonly Atom[]; payloadOffset: number; payloadSize: number; }`
- パースは「ヘッダのみ走査して payload はオフセット + サイズで保持」する遅延読み取り方式 (大きい `mdat` を全部メモリに乗せない)。
- 書き込みは「変更したい アトム集合だけを差し替えた新ツリー」を作り、最後にシリアライズ + chunk offset 補正。

## 主要な公開 API (案)

```ts
/** A single MP4 box (atom) with lazily-resolved payload bounds. */
export type Atom = {
  type: string;
  offset: number;
  size: number;
  payloadOffset: number;
  payloadSize: number;
  children?: readonly Atom[];
};

/** Parse the atom tree from an MP4 buffer. */
export const parseAtomTree: (buffer: Uint8Array) => readonly Atom[];
```

## ディレクトリ構成案

```
src/
  formats/
    mp4/
      readMp4.ts
      writeMp4.ts
      detectMp4.ts
      atom/
        parseAtomTree.ts
        parseAtomTree.test.ts
        findAtom.ts
        types.ts
      itunes/
        readIlst.ts
        writeIlst.ts
        atomToTagField.ts
        tagFieldToAtom.ts
      chunkOffset/
        updateChunkOffsets.ts
        updateChunkOffsets.test.ts
```

## 依存

- Phase 1 (基盤)
- Phase 9 (画像/チャプター対応) と一部連携するが、Phase 4 単体では `covr` の raw 透過まで完了させる

## テスト方針

- アトム ツリー パーサー: 単純な MP4 (ftyp + moov + mdat の 3 ボックス) の構造で正確に走査できることを確認
- メタデータ アトム個別: `©nam` (UTF-8 文字列)、`trkn` (binary)、`covr` (画像) の read / write
- `stco` / `co64` を含む実ファイル相当の構造でメタデータ書き換え後にオフセットが正しく更新されること
- ATL.NET の MP4 フィクスチャを参考に、最小サイズで再現できるものを採用

## 完了条件 (DoD)

- MP4 / M4A の主要メタデータの read / write
- chunk offset 更新が正しく機能 (テストで保証)
- ラウンドトリップ + プレイヤーで再生できる成果物の手動検証
- typecheck / test / biome check が通る

## 参考資料

- ISO/IEC 14496-12 (ISO Base Media File Format)
- iTunes Metadata: <https://atomicparsley.sourceforge.net/mpeg-4files.html>
- ATL.NET: `ATL/AudioData/IO/MP4.cs`
