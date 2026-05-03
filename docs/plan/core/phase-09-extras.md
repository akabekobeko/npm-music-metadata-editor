# Phase 9: Lyrics / Chapters / Pictures

## 目的

各タグ形式に共通する **拡張メタデータ** を統一インターフェースで扱えるようにする。Phase 2〜8 で各タグ/コンテナの raw 透過は済んでいるため、本フェーズで「論理データ ↔ 各タグ形式」の変換層を完成させる。

## スコープ

### Pictures (埋め込み画像) (`src/extras/picture/`)

- `PictureInfo` 型 (`mime`, `kind`, `description`, `data`)
- 画像種別 (`'cover-front'`, `'cover-back'`, `'icon'`, ...) を ID3v2 APIC の picture type に揃える
- MIME 検出: PNG / JPEG / GIF / BMP / TIFF / WebP のシグネチャから自動判定
- 各タグ形式での表現に変換 (Phase 9 のうち)
  - ID3v2 APIC ↔ PictureInfo
  - FLAC PICTURE block ↔ PictureInfo
  - Vorbis Comment `METADATA_BLOCK_PICTURE` (base64) ↔ PictureInfo
  - MP4 `covr` ↔ PictureInfo
  - APE Tag binary item (`Cover Art (Front)` 等) ↔ PictureInfo
  - WMA `WM/Picture` ↔ PictureInfo

### Lyrics (歌詞) (`src/extras/lyrics/`)

- `LyricsInfo` 型: `language`、`description`、`unsynchronized`、`synchronized: { time: ms; text: string }[]`
- ID3v2 USLT (Unsynchronized) / SYLT (Synchronized)
- LRC 文字列のパースと生成 (汎用ユーティリティとして)
- Vorbis Comment / MP4 `©lyr` (Unsynchronized のみ)

### Chapters (チャプター) (`src/extras/chapter/`)

- `ChapterInfo` 型: `start`、`end`、`title`、`url`、`subChapters?`
- ID3v2 CHAP / CTOC の read / write
- MP4 nero/quicktime chapter atoms (`chap` 参照) は Phase 9 では **読み込みのみ** とし、書き込みは Phase 10 でユース ケースが固まった段階で再評価

### 公開 API への組み込み

- `MetadataReadResult.pictures` / `.chapters` / `.lyrics` を埋める
- `writeMetadata` の `tag` パラメータで `pictures` / `chapters` / `lyrics` を上書きできる

## 設計方針

- 拡張メタデータの「中間表現」は単一 (`PictureInfo` / `LyricsInfo` / `ChapterInfo`) に保ち、フォーマット側に合わせて形を変えない。フォーマット固有の付加情報 (例: ID3v2 のフレーム ID、Vorbis Comment のキー名) は raw 透過の経路で保持する。
- 双方向の変換を純関数で実装し、各方向ごとにテストを書く (例: `picturesToApic` と `apicToPictures`)。

## 主要な公開 API (案)

```ts
/** Embedded picture descriptor (cover art and friends). */
export type PictureInfo = {
  mime: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/bmp' | 'image/tiff' | 'image/webp' | string;
  kind: PictureKind;
  description?: string;
  data: Uint8Array;
};
```

## ディレクトリ構成案

```
src/
  extras/
    picture/
      detectMime.ts
      types.ts
      converters/
        apic.ts
        flacPicture.ts
        metadataBlockPicture.ts
        mp4Covr.ts
        apeBinaryItem.ts
        wmPicture.ts
    lyrics/
      lrc.ts
      types.ts
      converters/
        uslt.ts
        sylt.ts
        vorbisLyrics.ts
        mp4Lyrics.ts
    chapter/
      types.ts
      converters/
        chap.ts
```

## 依存

- Phase 2 (ID3v2 で APIC / USLT / CHAP の raw を握っている)
- Phase 3 (FLAC PICTURE、Vorbis Comment METADATA_BLOCK_PICTURE)
- Phase 4 (MP4 covr / ©lyr)
- Phase 6 (APE binary)
- Phase 8 (WMA picture)

## テスト方針

- 画像 MIME 検出: 各形式の最小 4〜8 byte シグネチャでテスト
- 各タグ形式 ↔ PictureInfo 双方向変換 (1 種類ずつ独立した unit test)
- LRC パーサー: 行番号、タイムスタンプ精度 (10ms / 1ms)、ID タグ (`[ar:Artist]`)
- ID3v2 CHAP/CTOC の階層を含むケース
- 拡張メタデータあり/なしの両方で `readMetadata` / `writeMetadata` のラウンドトリップ

## 完了条件 (DoD)

- Pictures / Lyrics / Chapters の中間表現が確定し、各タグ形式とのマッピングが動作する
- 主要プレイヤー (iTunes / VLC / foobar2000) で書き込んだメタデータが視認できる手動検証
- typecheck / test / biome check が通る

## 参考資料

- ID3v2 APIC / USLT / SYLT / CHAP / CTOC
- ATL.NET: `ATL/Entities/PictureInfo.cs`、`ATL/Entities/LyricsInfo.cs`、`ATL/Entities/ChapterInfo.cs`
