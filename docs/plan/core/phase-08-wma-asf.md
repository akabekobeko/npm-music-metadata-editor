# Phase 8: WMA / ASF

## 目的

ASF (Advanced Systems Format) コンテナ上の WMA メタデータ (Content Description / Extended Content Description) の read/write を実装する。

## スコープ

### ASF オブジェクト パーサー (`src/formats/wma/asf/`)

- 16 byte の GUID + 8 byte のサイズで構成されるオブジェクト ツリー
- 主要オブジェクト
  - `Header Object` → 子オブジェクト群を内包
    - `File Properties Object` (再生時間など)
    - `Stream Properties Object` (コーデック情報)
    - `Content Description Object` (Title, Author, Copyright, Description, Rating)
    - `Extended Content Description Object` (任意の WM/* プロパティ)
    - `Content Branding Object`
- `Data Object` (オーディオ パケット — 解析対象外)

### WMA メタデータ (`src/formats/wma/metadata/`)

- Content Description: 固定 5 フィールド
- Extended Content Description: `name -> value` 任意の Key-Value
- 値の型 (Unicode string, byte array, BOOL, DWORD, QWORD, WORD, GUID) に応じた read/write
- 既知の `WM/AlbumTitle`、`WM/Genre`、`WM/Year`、`WM/TrackNumber` 等を `TagData` にマッピング
- 不明なプロパティは raw bytes で保持し、書き戻しを保証

### 書き込み戦略

- Header Object 全体を再構築し、`Data Object` の前に書き戻す
- Header Object のサイズ変動に伴い、`File Properties Object` 内の総ファイル サイズ フィールドを更新
- `Header Extension Object` 内のオブジェクトはパース不要なら raw 透過

## 設計方針

- GUID は文字列 (`'75B22630-668E-11CF-A6D9-00AA0062CE6C'` 等) で保持しつつ、内部的には 16 byte little-endian/big-endian 混在仕様 (Microsoft GUID) を意識する。
- `Extended Content Description` の値型ごとに read/write 関数を分離し、type code → 関数のマッピング Object を経由する。

## 主要な公開 API (案)

```ts
/** ASF object descriptor. */
export type AsfObject = {
  guid: string;
  size: bigint;
  offset: number;
  payloadOffset: number;
  payloadSize: bigint;
  children?: readonly AsfObject[];
};

/** Parse the ASF object tree from a WMA buffer. */
export const parseAsfTree: (buffer: Uint8Array) => readonly AsfObject[];
```

## ディレクトリ構成案

```
src/
  formats/
    wma/
      readWma.ts
      writeWma.ts
      detectWma.ts
      asf/
        parseAsfTree.ts
        guid.ts
        types.ts
      metadata/
        readContentDescription.ts
        readExtendedDescription.ts
        writeContentDescription.ts
        writeExtendedDescription.ts
```

## 依存

- Phase 1 (基盤)

## テスト方針

- ATL.NET WMA フィクスチャの最小構成を再利用
- Content Description のみのファイル / Extended のみ / 両方ありの 3 ケース
- 値型 (DWORD / QWORD / Unicode / byte array) ごとのラウンドトリップ
- 書き換えで Header Object のサイズが伸縮するケース

## 完了条件 (DoD)

- WMA の read / write
- Windows Media Player など実プレイヤーでメタデータが反映されることの手動確認
- typecheck / test / biome check が通る

## 参考資料

- ASF Specification (Revision 01.20.05)
- ATL.NET: `ATL/AudioData/IO/WMA.cs`
