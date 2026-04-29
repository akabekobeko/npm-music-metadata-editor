# Phase 2: ID3v1 / ID3v2 + MP3

## 目的

最初に対応するコンテナとして MP3 を選び、ID3v1 と ID3v2 (2.3 / 2.4 を主、2.2 は読み込みのみ) の **read / write** を完成させる。
このフェーズで「タグ形式の Reader/Writer モジュール」と「コンテナ形式の Reader/Writer モジュール」がどう連携するかのパターンが確立される。

## スコープ

### ID3v1 (`src/tags/id3v1/`)

- `readId3v1(buffer): Id3v1Tag | undefined` — ファイル末尾の 128 バイトを検査し、`'TAG'` シグネチャを確認
- `writeId3v1(tag): Uint8Array` — 128 バイト固定長を生成
- ID3v1.1 (track number 対応) もサポート
- 文字エンコーディングは Latin-1 を既定とし、`ReadOptions.id3v1Encoding` で変更可能 (ATL.NET の Settings 相当)

### ID3v2 (`src/tags/id3v2/`)

- `readId3v2(buffer): Id3v2Tag | undefined` — `ID3` シグネチャ + ヘッダ パース
- `writeId3v2(tag, options): Uint8Array`
- 主要フレーム
  - テキスト情報: `T*` (TIT2, TPE1, TALB, TYER/TDRC, TCON, TRCK, TPOS, ...)
  - URL リンク: `W*`
  - コメント: `COMM`
  - 歌詞 (USLT) ※ Phase 9 と連携
  - 画像 (APIC) ※ Phase 9 と連携 (Phase 2 では読み出しのみ実装でも可)
  - チャプター (CHAP/CTOC) ※ Phase 9 と連携
- バージョン別の挙動
  - 2.2 (3 文字フレーム ID): **読み込みのみ**。書き込みは 2.3/2.4 のみ。
  - 2.3 (4 文字フレーム ID + 同期安全サイズ)
  - 2.4 (UTF-8 / footer / unsynchronization の改訂)
- 機能対応
  - Unsynchronization (header / frame 単位)
  - Extended header (読み飛ばし優先)
  - Frame flags (compression / encryption は **未対応として明示エラー**)

`parseId3v2/` サブディレクトリに代表関数 `parseId3v2.ts` と、サブルーチンの `parseHeader.ts`、`parseFrame.ts`、`parseTextFrame.ts` などをコロケーション配置する (`docs/rules/code-style.md`に準拠)。書き込み側も `buildId3v2/buildId3v2.ts` を代表として同じ構成を取る。

### MP3 オーディオ ヘッダ (`src/formats/mp3/`)

- フレーム ヘッダから `bitrate` / `sampleRate` / `channels` / `duration (概算)` を取得
- VBR Header (Xing/VBRI) も対応 (再生時間精度向上)
- Phase 2 では再生時間が不要なら **後回し可**。タグの read/write が主目的。

### 公開 API への組み込み

- `readMetadata` で MP3 が来たら ID3v2 → ID3v1 の優先順位で読み (Cross-Reading 簡易版)
- `writeMetadata` で MP3 が来たら ID3v2 を書き換え (もしくは新規作成)、ID3v1 は `WriteOptions.includeId3v1` で制御

## 設計方針

- ID3v1 / ID3v2 は MP3 以外 (WAV, AIFF など) でも再利用するため、`src/tags/` に置き、コンテナからは **タグ部分の Buffer を切り出して渡す** 形で疎結合にする。
- フレーム ID → パーサー関数のマッピングを Object で持つ。未知のフレームは raw bytes で保持し、書き込み時に再現する (情報損失防止)。
- フレーム書き込みは「フレーム → bytes」の純関数の集まりとし、ヘッダ サイズ計算は最後にまとめて行う。

## 主要な公開 API (案)

```ts
/** Parsed ID3v2 tag. */
export type Id3v2Tag = {
  version: { major: 2 | 3 | 4; revision: number };
  flags: { unsynchronization: boolean; extendedHeader: boolean; experimental: boolean; footer: boolean };
  frames: readonly Id3v2Frame[];
};

/** Read ID3v2 tag from the head of an MP3 (or other container) buffer. */
export const readId3v2: (buffer: Uint8Array) => Id3v2Tag | undefined;
```

## ディレクトリ構成案

```
src/
  tags/
    id3v1/
      readId3v1.ts
      readId3v1.test.ts
      writeId3v1.ts
      writeId3v1.test.ts
      types.ts
    id3v2/
      readId3v2.ts
      readId3v2.test.ts
      writeId3v2.ts
      writeId3v2.test.ts
      parseId3v2/
        parseId3v2.ts            # 代表関数
        parseHeader.ts           # サブルーチン
        parseFrame.ts
        parseTextFrame.ts
        parseCommentFrame.ts
        ...
      buildId3v2/
        buildId3v2.ts            # 代表関数
        buildHeader.ts           # サブルーチン
        buildFrame.ts
        ...
      types.ts
  formats/
    mp3/
      readMp3.ts
      writeMp3.ts
      detectMp3.ts
      audioHeader.ts
```

## 依存

- Phase 1 (BufferCursor / BufferWriter / 共通 type / フォーマット検出登録)

## テスト方針

- ATL.NET の `ATL.unit-test/Resources/MP3/` を参考に最小限の MP3 フィクスチャを `tests/fixtures/mp3/` に配置 (置き場は Phase 1 で決定)。サイズが大きくなる場合は **生成スクリプト** を別途用意し、リポジトリにバイナリを置かない選択肢も検討する。
- ID3v1 / ID3v2 ともに「read → write → read」のラウンドトリップを基本テスト ケースに据える。
- 既存タグへの上書き (size が増える / 減る) のケースを書く。
- 不正フレーム長、Unsynchronization 有効時、UTF-16 BOM 有無を網羅。
- パディング、フレームのバージョン互換 (2.4 で書いたものを 2.3 で読まない / 逆) を確認。

## 完了条件 (DoD)

- ID3v1 read/write、ID3v2.3/2.4 read/write が完了
- ID3v2.2 read 対応
- MP3 ファイルに対する `readMetadata` / `writeMetadata` がエンドツーエンドで動く
- ラウンドトリップ テストが緑
- typecheck / test / biome check が通る

## 参考資料

- ID3v2.3 仕様: <https://id3.org/id3v2.3.0>
- ID3v2.4 仕様: <https://id3.org/id3v2.4.0-structure>、<https://id3.org/id3v2.4.0-frames>
- ATL.NET: `ATL/AudioData/IO/ID3v1.cs`、`ATL/AudioData/IO/ID3v2.cs`、`ATL/AudioData/IO/MPEGaudio.cs`
