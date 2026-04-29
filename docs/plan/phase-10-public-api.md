# Phase 10: Public API & Polish

## 目的

ここまでに完成した個別フォーマット モジュールを統合し、ライブラリ利用者向けの **使いやすい高レベル API** に整える。
ATL.NET の `Track` クラスに相当する一括 API を提供しつつ、クラスを使わない方針 (function + Object) を貫く。

## スコープ

### 高レベル API

- `loadTrack(input)` — ファイル パス / Buffer から `Track` Object を返す
- `Track` Object のフィールド: `title` / `artist` / `album` / `pictures` / `chapters` / `lyrics` / `additionalFields` / `audioFormat` / `durationMs` / ...
- `saveTrack(track, options)` — 編集結果を書き戻す (パス指定なら同名上書き、Buffer 指定なら新しい Buffer を返す)
- `Track` は **Plain Object として返す**。書き換えは「Object をいったん展開 → 編集 → `saveTrack(modifiedTrack)`」の関数型スタイルを推奨し、内部に setter を持たせない。

### Cross-Reading 戦略

- 1 ファイル中に複数のタグ形式 (例: MP3 + ID3v2 + APE + ID3v1) がある場合の優先度を `ReadOptions.tagPriority` で制御
- 既定値は ATL.NET と揃える: `['id3v2', 'ape', 'native', 'id3v1']`

### エラー戦略の統一

- カスタム エラー型 `MmeError` (Music Metadata Editor) を定義 (class ではなく function + Object で表現する。`type MmeError = { name: 'MmeError'; code: ErrorCode; message: string; cause?: unknown }`)
- 主なエラー コード
  - `'unsupported-format'`
  - `'invalid-tag'`
  - `'truncated-input'`
  - `'unsupported-feature'` (compression / encryption frame など)
- 部分的な読み取り失敗 (一部フレームが壊れている等) はエラーにせず、`MetadataReadResult.warnings: readonly Warning[]` で返す方針

### ストリーミング読み込み

- Phase 1 で見送った大容量ファイル対応をここで再検討
- 必要に応じて `readMetadataFromStream(readable)` を追加 (実装するかは Phase 9 終了時点のニーズで決定)

### ドキュメント

- README に使用例 (`loadTrack` / `saveTrack` / cover art 編集 / 歌詞編集) を追加
- API リファレンスは TSDoc から `typedoc` などで自動生成。導入はこのフェーズで判断
- 各タグ形式と `TagData` フィールドの対応表を `docs/field-mapping.md` として整理

### パフォーマンス

- 大きなファイル (例: 1GB の WAV) の `readMetadata` が定数時間に近いことを ベンチで確認
- 必要に応じて `Buffer` の遅延読み取り (`fs.read` で必要範囲のみ) を導入

## 設計方針

- 「個別 API (`readMetadata` / `writeMetadata`) を使う上級者向けレイヤ」と「`loadTrack` / `saveTrack` のシンプル レイヤ」の 2 層を維持する。
- `Track` Object は `readonly` プロパティの組み合わせとし、編集は `{ ...track, title: 'New' }` のスプレッドで行う前提。

## 主要な公開 API (案)

```ts
/** High-level track representation aggregating metadata from any supported format. */
export type Track = {
  readonly audioFormat: AudioFormat;
  readonly durationMs?: number;
  readonly tag: TagData;
  readonly pictures: readonly PictureInfo[];
  readonly chapters: readonly ChapterInfo[];
  readonly lyrics?: LyricsInfo;
  readonly additionalFields: Readonly<Record<string, string>>;
};

/** Load a track from a file path or in-memory buffer. */
export const loadTrack: (input: string | Uint8Array, options?: ReadOptions) => Promise<Track>;

/** Persist a modified track. */
export const saveTrack: (track: Track, options?: SaveTrackOptions) => Promise<Uint8Array | void>;
```

## ディレクトリ構成案

```
src/
  mme.ts              # readMetadata / writeMetadata / loadTrack / saveTrack を再 export
  api/
    loadTrack.ts
    saveTrack.ts
    readMetadata.ts   # 旧 src/mme.ts の readMetadata 実装をここへ移譲
    writeMetadata.ts
  errors/
    mmeError.ts
docs/
  field-mapping.md
```

> エントリ ポイントのファイル名は Phase 1 で決定したとおり `mme.ts` (Barrel File と混同するため `index` は使わない)。

## 依存

- Phase 1〜9 すべて

## テスト方針

- 各フォーマットでの `loadTrack` → 編集 → `saveTrack` → 再 `loadTrack` のラウンドトリップ
- 部分破損ファイルの warning ハンドリング
- ストリーミング対応を実装する場合は、メモリ使用量の上限テスト (heap snapshot など)

## 完了条件 (DoD)

- 高レベル API (`loadTrack` / `saveTrack`) の動作
- エラー / Warning 戦略の整備
- README の使用例とフィールド対応表が揃う
- すべてのフェーズの test / typecheck / biome check が緑
- リリース版 1.0.0 を公開できる状態になる

## 参考資料

- ATL.NET: `ATL/Entities/Track.cs`
- ATL.NET README の使用例
