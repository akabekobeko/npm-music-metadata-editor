# Phase 5: OGG Container (Vorbis / Opus)

## 目的

OGG コンテナ (Vorbis、Opus、Speex は将来検討) のページ構造を解析し、Vorbis Comment を編集できるようにする。
Vorbis Comment 自体は Phase 3 で完成済みのため、本フェーズは **OGG の framing** に集中する。

## スコープ

### OGG ページ パーサー (`src/formats/ogg/page/`)

- `OggS` キャプチャ パターン検出
- ページ ヘッダ (version, flags, granule position, bitstream serial number, sequence, segment table)
- ページ → packet 復元 (lacing)
- ページ → packet → Vorbis/Opus コーデック レイヤ

### Vorbis ストリーム

- 識別パケット (`packet[0]` = `0x01`, magic `vorbis`) → サンプル レート、チャンネル数
- コメント パケット (`packet[0]` = `0x03`, magic `vorbis`) → Vorbis Comment (Phase 3 を呼び出し)
- セットアップ パケットはパースせず透過

### Opus ストリーム

- `OpusHead` (id ヘッダ) → サンプル レート、チャンネル数、preskip
- `OpusTags` (comment ヘッダ) → Vorbis Comment 互換 (Phase 3 を呼び出し)

### 書き込み戦略

- Vorbis Comment パケットを差し替える際、ページ サイズが変わるため再ページ化が必要
- 最小単位の書き換え: コメント パケットを含むページ群を再構築し、それ以降のページは granule position と sequence を維持しつつ位置のみ移動 (内容変更なし)
- granule position や CRC32 の再計算を行う (CRC32 は OGG 固有の多項式 0x04C11DB7)

### 公開 API への組み込み

- `readMetadata` / `writeMetadata` で OGG / Opus を扱う
- フォーマット検出: マジック `OggS` + 内部の最初のパケットでコーデック判定

## 設計方針

- 「ページ」「パケット」「コーデック ストリーム」のレイヤを分離 (`src/formats/ogg/page/`、`src/formats/ogg/packet/`、`src/formats/ogg/streams/`)。
- CRC32 は table-based 実装。`utils/crc32Ogg.ts` に切り出す (汎用ではなく OGG 用と明示)。
- 既存 packet を 1 byte でも書き換えたら CRC を必ず再計算する規約をテストで担保する。

## 主要な公開 API (案)

```ts
/** OGG page header. */
export type OggPage = {
  version: number;
  headerType: number;
  granulePosition: bigint;
  serialNumber: number;
  pageSequence: number;
  crcChecksum: number;
  segmentSizes: readonly number[];
  payload: Uint8Array;
};

/** Iterate pages from an OGG buffer (lazy). */
export const parseOggPages: (buffer: Uint8Array) => Iterable<OggPage>;
```

## ディレクトリ構成案

```
src/
  formats/
    ogg/
      readOgg.ts
      writeOgg.ts
      detectOgg.ts
      page/
        parseOggPages.ts
        rebuildOggPages.ts
        crc32.ts
      packet/
        assemblePackets.ts
      streams/
        vorbis.ts
        opus.ts
```

## 依存

- Phase 1 (基盤)
- Phase 3 (Vorbis Comment Reader/Writer)

## テスト方針

- ページ パーサー: ATL.NET の Ogg/Opus フィクスチャを最小単位で利用
- CRC32 計算が仕様適合 (RFC 3533) の既知値と一致することをテーブル ベースで検証
- コメント パケット書き換え後の granule position と CRC が正しいこと
- マルチページにまたがる Vorbis Comment (大きな画像入りなど) でも正しく読み書きできること
- ラウンドトリップ

## 完了条件 (DoD)

- Vorbis / Opus の メタデータ read / write
- 再ページ化後も正規のプレイヤー (ffmpeg/vorbiscomment 等) で読めることを手動確認
- typecheck / test / biome check が通る

## 参考資料

- RFC 3533 (Ogg)、RFC 7845 (Opus)
- ATL.NET: `ATL/AudioData/IO/Ogg.cs`、`ATL/AudioData/IO/VorbisTag.cs`
