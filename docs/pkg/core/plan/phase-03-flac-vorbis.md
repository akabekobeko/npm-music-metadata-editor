# Phase 3: FLAC + Vorbis Comment

## 目的

FLAC コンテナの read/write と、汎用タグ形式である **Vorbis Comment** の共通実装を整える。Vorbis Comment は OGG (Phase 5) でも再利用するため、本フェーズで切り出しておく。

## スコープ

### Vorbis Comment 共通実装 (`src/tags/vorbisComment/`)

- `readVorbisComment(buffer): VorbisComment` — `vendor` + `comments[]` を返す
- `writeVorbisComment(tag): Uint8Array`
- フィールド名はキーの大文字小文字を **case-insensitive** に扱う (ARTIST / Artist / artist は同一)
- マルチバリュー対応 (同じキーが複数回出現)
- `METADATA_BLOCK_PICTURE` の base64 解釈は Phase 9 で実装するが、データ パススルーは Phase 3 で完了させる

### FLAC コンテナ (`src/formats/flac/`)

- `fLaC` シグネチャ確認
- メタデータ ブロック (STREAMINFO, PADDING, APPLICATION, SEEKTABLE, VORBIS_COMMENT, CUESHEET, PICTURE) のリスト読み取り
- VORBIS_COMMENT ブロックの抽出 → Phase 3 の Vorbis Comment Reader へ
- PICTURE ブロックの抽出 → `PictureInfo` への変換 (Phase 9 と連携)
- 書き込み: VORBIS_COMMENT を更新し、PADDING を活用してリライトを最小化
  - 書き換え後に必要なバイト数 ≤ 既存ブロック領域の場合は in-place 書き換え
  - 不足する場合は PADDING を再分配または新規確保 (オーディオ部の再書き込みを避ける)
- STREAMINFO から `sampleRate` / `bitsPerSample` / `channels` / `totalSamples` / `duration` を取得

### 公開 API への組み込み

- `readMetadata` / `writeMetadata` で FLAC を扱えるようにする
- フォーマット検出 (Phase 1 で用意した registry) に FLAC を登録

## 設計方針

- Vorbis Comment は「key=value 文字列の配列」という単純な構造。`type VorbisComment = { vendor: string; comments: readonly { key: string; value: string }[] }` を採用し、キーの大文字統一はアクセサ関数側で行う。
- FLAC の書き換えは「メタデータ部分のみのリビルド」で済むよう設計する。オーディオ フレームを読み取る必要はない (オフセットのみ把握)。

## 主要な公開 API (案)

```ts
/** Vorbis Comment block. */
export type VorbisComment = {
  vendor: string;
  comments: readonly { key: string; value: string }[];
};

/** Decode a Vorbis Comment block from a buffer. */
export const readVorbisComment: (buffer: Uint8Array) => VorbisComment;

/** Encode a Vorbis Comment block as a Uint8Array (without OGG/FLAC framing). */
export const writeVorbisComment: (tag: VorbisComment) => Uint8Array;
```

## ディレクトリ構成案

```
src/
  tags/
    vorbisComment/
      readVorbisComment.ts
      readVorbisComment.test.ts
      writeVorbisComment.ts
      writeVorbisComment.test.ts
      types.ts
  formats/
    flac/
      readFlac.ts
      writeFlac.ts
      detectFlac.ts
      parseFlac/
        parseFlac.ts             # 代表関数
        parseStreamInfo.ts       # サブルーチン
        parseMetadataBlock.ts
        ...
      buildFlac/
        buildFlac.ts             # 代表関数
        buildMetadataBlock.ts    # サブルーチン
        rebalancePadding.ts
        ...
```

## 依存

- Phase 1 (基盤)

## テスト方針

- Vorbis Comment 単体: vendor 文字列、複数フィールド、空コメント、マルチバイト UTF-8、`=` を含む値、空配列を網羅
- FLAC: STREAMINFO 必須ブロックの最小構成、複数 PADDING、Picture 含むファイルなど ATL.NET フィクスチャを参照
- ラウンドトリップ (read → write → read で内容一致)
- PADDING 再分配の境界 (パディング充足 / パディング不足で拡張する) を 2 ケース以上

## 完了条件 (DoD)

- Vorbis Comment 読み書きが単体で動作
- FLAC 読み書きで Vorbis Comment が反映される
- ラウンドトリップ テストが緑
- typecheck / test / biome check が通る

## 参考資料

- FLAC 仕様: <https://xiph.org/flac/format.html>
- Vorbis Comment 仕様: <https://xiph.org/vorbis/doc/v-comment.html>
- ATL.NET: `ATL/AudioData/IO/FLAC.cs`、`ATL/AudioData/IO/VorbisTag.cs`、`ATL/AudioData/IO/Helpers/FlacHelper.cs`
