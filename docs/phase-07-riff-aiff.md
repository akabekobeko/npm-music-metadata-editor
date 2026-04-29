# Phase 7: RIFF (WAV) + AIFF

## 目的

RIFF コンテナ (主に WAV) と AIFF (IFF 派生) のチャンク構造を解析し、メタデータ チャンクを read/write できるようにする。

## スコープ

### RIFF / WAV (`src/formats/wav/`)

- `RIFF` + `WAVE` 識別
- 主要チャンク
  - `fmt ` — オーディオ フォーマット
  - `data` — オーディオ データ (パースしない)
  - `LIST` (`INFO`) — レガシー メタデータ (`INAM`, `IART`, `IPRD`, ...)
  - `id3 ` — ID3v2 チャンク (Phase 2 を呼び出し)
  - `bext` — Broadcast Wave Format (EBU TECH 3285) (オプション)
  - `iXML` — XML メタデータ (オプション)
- 書き込み: チャンク サイズ変更で **`data` のオフセット移動** が必要なケースは少ないが、`LIST` / `id3 ` チャンク差し替え時のリサイズに対応
  - WAV は header → metadata chunks → data → trailing chunks の順が一般的。`data` 後ろに置けば再生に影響しない (実装簡素化のため後置を選ぶことを推奨)

### AIFF (`src/formats/aiff/`)

- `FORM` + (`AIFF` | `AIFC`) 識別
- `COMM`, `SSND` (data), `NAME`, `AUTH`, `(c) ` (copyright), `ANNO`, `ID3 ` などのチャンク
- ビッグ エンディアンを基本とする (ATL.NET の StreamUtils と挙動が異なるので注意)
- ID3v2 チャンク経由でも編集可能にする

### 公開 API への組み込み

- `readMetadata` / `writeMetadata` に WAV / AIFF を追加
- フォーマット検出 (RIFF / FORM の magic + サブタイプ)

## 設計方針

- RIFF と AIFF はチャンク レイアウトが似ている (RIFF=LE, AIFF=BE) ため、チャンク列挙ロジックを共通化できる箇所は `src/formats/iff/` のような共通モジュールに切り出すことを検討する。判断は実装着手時に行い、共有は **コードの重複が確実に減る場合のみ** とする。
- `LIST/INFO` の各サブチャンク (`INAM` 等) → `TagData` のマッピングは Object で持ち、未知のサブチャンクは raw bytes 保持。

## 主要な公開 API (案)

```ts
/** Generic IFF chunk descriptor. */
export type Chunk = {
  id: string;
  offset: number;
  size: number;
  payloadOffset: number;
  payloadSize: number;
};

/** Iterate top-level chunks from a RIFF/AIFF buffer. */
export const parseChunks: (
  buffer: Uint8Array,
  options: { endianness: 'little' | 'big' },
) => readonly Chunk[];
```

## ディレクトリ構成案

```
src/
  formats/
    wav/
      readWav.ts
      writeWav.ts
      detectWav.ts
      parseWav/
        parseFmt.ts
        parseListInfo.ts
        ...
    aiff/
      readAiff.ts
      writeAiff.ts
      detectAiff.ts
    iff/
      parseChunks.ts          # RIFF / AIFF 共通 (採用判断は実装時)
```

## 依存

- Phase 1 (基盤)
- Phase 2 (id3 chunk 経由で ID3v2 を再利用)

## テスト方針

- 最小サイズの WAV (`fmt ` + 短い `data`) を生成し、`LIST/INFO` を後置で書き加えるラウンドトリップ
- AIFF の big-endian チャンク サイズ読み取り
- ID3v2 を含む WAV (例: 一部 DAW が出力する形式) の読み込み
- データ サイズ変更を伴う書き換え

## 完了条件 (DoD)

- WAV / AIFF の read / write
- ID3v2 chunk 経由でのメタデータ編集
- 任意の DAW / プレイヤーで再生できる成果物の手動検証
- typecheck / test / biome check が通る

## 参考資料

- RIFF: <https://en.wikipedia.org/wiki/Resource_Interchange_File_Format>
- WAV LIST/INFO: <https://www.recordingblogs.com/wiki/list-chunk-of-a-wave-file>
- AIFF: <https://en.wikipedia.org/wiki/Audio_Interchange_File_Format>
- ATL.NET: `ATL/AudioData/IO/WAV.cs`、`ATL/AudioData/IO/AIFF.cs`、`ATL/AudioData/IO/Helpers/`
