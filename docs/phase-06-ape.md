# Phase 6: APE Tag + Monkey's Audio

## 目的

APE Tag (v1.0 / v2.0) の読み書きを実装し、Monkey's Audio (`.ape`) コンテナのメタデータ編集を完成させる。
APE Tag は MP3 / WV / MPC など他フォーマットでも使われるため、Phase 6 で共通実装を整える。

## スコープ

### APE Tag 共通実装 (`src/tags/ape/`)

- フッタ署名 `APETAGEX` 検出 (ファイル末尾)
- ヘッダ オプショナル (v2 のみ)
- アイテム: `key=value (UTF-8 / Binary / External)`
- 読み込み: `readApeTag(buffer): ApeTag | undefined`
- 書き込み: `writeApeTag(tag): Uint8Array`
- ID3v1 と APE が共存するファイル (MP3 + APE + ID3v1) のレイアウトに留意:
  - APE ヘッダ (任意) → APE データ → APE フッタ → ID3v1
  - 書き込み順序の維持

### Monkey's Audio コンテナ (`src/formats/ape/`)

- `MAC ` シグネチャ
- ヘッダから `sampleRate` / `channels` / `bitsPerSample` / `totalFrames` 等を抽出
- メタデータ部のオフセット計算 (APE Tag は EOF 側)

### 公開 API への組み込み

- MP3 (Phase 2) で APE Tag が併存している場合の優先度設定: `ReadOptions.tagPriority = ['id3v2', 'ape', 'id3v1']` のようにユーザー指定可能にする (デフォルトは ATL.NET と同じ ID3v2 → APE → Native → ID3v1)
- `.ape` ファイルでは APE Tag 単独で動作

## 設計方針

- APE Tag は MP3 と APE の両方から呼ばれるため、`src/tags/ape/` の純粋なバイナリ ↔ オブジェクト変換に留め、ファイル位置の決定はコンテナ側 (`src/formats/mp3/`、`src/formats/ape/`) に任せる。
- バイナリ アイテム (例: cover art) は `Uint8Array` のまま保持し、Phase 9 の `PictureInfo` への変換は formats 側で行う。

## 主要な公開 API (案)

```ts
/** APE tag item. */
export type ApeItem = {
  key: string;
  /** UTF-8 string for text items, raw bytes for binary items. */
  value: string | Uint8Array;
  type: 'text' | 'binary' | 'external';
  readOnly: boolean;
};

/** Parsed APE tag. */
export type ApeTag = {
  version: 1000 | 2000;
  items: readonly ApeItem[];
};

/** Read APE tag from the tail end of a buffer. */
export const readApeTag: (buffer: Uint8Array) => ApeTag | undefined;
```

## ディレクトリ構成案

```
src/
  tags/
    ape/
      readApeTag.ts
      readApeTag.test.ts
      writeApeTag.ts
      writeApeTag.test.ts
      types.ts
  formats/
    ape/
      readApe.ts
      writeApe.ts
      detectApe.ts
```

## 依存

- Phase 1 (基盤)
- Phase 2 (MP3 と併用するクロス リーディング)

## テスト方針

- APE Tag v1 / v2 の境界 (header の有無、フラグ) を網羅
- バイナリ アイテム (cover art 相当) を含むケースの read/write
- MP3 + APE + ID3v1 の三層レイアウトでのラウンドトリップ
- ATL.NET の APE / MP3 フィクスチャを参考に最小サイズで作成

## 完了条件 (DoD)

- APE Tag read/write
- `.ape` ファイル (Monkey's Audio) で `readMetadata` / `writeMetadata` が動く
- MP3 + APE Tag のクロス リーディングが優先度設定どおりに動く
- typecheck / test / biome check が通る

## 参考資料

- APE Tag 仕様: <https://wiki.hydrogenaud.io/index.php?title=APE_key>
- Monkey's Audio: <https://www.monkeysaudio.com/>
- ATL.NET: `ATL/AudioData/IO/APEtag.cs`、`ATL/AudioData/IO/APE.cs`
